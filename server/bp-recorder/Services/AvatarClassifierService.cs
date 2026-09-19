using Compunet.YoloSharp;
using Compunet.YoloSharp.Data;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using OpenCvSharp;

namespace AvatarSideClassifierWeb.Services;

public class AvatarClassifierService : IDisposable
{
    private readonly ILogger<AvatarClassifierService> _logger;
    private readonly NameMappingService _mapping;
    private readonly Lazy<YoloPredictor> _predictor;

    public AvatarClassifierService(IWebHostEnvironment env, ILogger<AvatarClassifierService> logger, NameMappingService mapping)
    {
        _logger = logger;
        _mapping = mapping;

        var modelPath = Path.Combine(env.ContentRootPath, "Assets", "Model", "Common", "avatar_side_classify_sim.onnx");
        _predictor = new Lazy<YoloPredictor>(() =>
        {
            if (!File.Exists(modelPath))
            {
                throw new FileNotFoundException("模型文件缺失，请将 avatar_side_classify_sim.onnx 放到 Assets/Model/Common/", modelPath);
            }

            var so = new Microsoft.ML.OnnxRuntime.SessionOptions();
            // Keep it CPU by default for portability; advanced users can tweak here
            so.AppendExecutionProvider_CPU();
            return new YoloPredictor(modelPath, new YoloPredictorOptions { SessionOptions = so });
        });
    }

    public async Task<object> ClassifyAsync(Stream imageStream)
    {
        using var img = await Image.LoadAsync<Rgb24>(imageStream);

        var result = _predictor.Value.Classify(img);
        var top = result.GetTopClass();

        // Match original logic: relax threshold for Qin/Costume
        bool isRelax = top.Name.Name.StartsWith("Qin", StringComparison.Ordinal) || top.Name.Name.Contains("Costume");
        double threshold = isRelax ? 0.51 : 0.7;
        if (top.Confidence < threshold)
        {
            return new
            {
                success = false,
                message = $"置信度过低: {top.Confidence:F2}, 识别结果: {top.Name.Name}",
                predicted = top.Name.Name,
                confidence = top.Confidence
            };
        }

        var (cn, costumeCn) = _mapping.Map(top.Name.Name);
        return new
        {
            success = true,
            predicted = top.Name.Name,
            confidence = top.Confidence,
            nameCn = cn,
            costumeCn,
            display = string.IsNullOrEmpty(costumeCn) ? cn : $"{cn}({costumeCn})"
        };
    }

    // 整屏截图 -> 自动判断是 4人联机 还是 单人编队，并进行相应的识别
    // 整屏截图 -> 专门且仅支持 4人联机 高精度自适应识别，全靠自动定位
    public async Task<object> ClassifyTeamAsync(Stream imageStream, int? origW = null, int? origH = null)
    {
        // 1. 将 Stream 读入内存中，以便 OpenCV 可以访问
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var bytes = ms.ToArray();

        // 2. 使用 OpenCV 进行 4 人联机检测和识别
        try
        {
            using var fullMat = Cv2.ImDecode(bytes, ImreadModes.Color);
            if (fullMat != null && !fullMat.Empty())
            {
                var coopResult = ClassifyCoop4(fullMat, origW, origH);
                if (coopResult != null)
                {
                    _logger.LogInformation("成功识别角色数据！");
                    return coopResult;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "自主匹配识别处理时发生异常错误");
            return new
            {
                success = false,
                message = $"识别内部错误: {ex.Message}"
            };
        }

        return new
        {
            success = false,
            message = "后端图片读取失败或其它未知错误"
        };
    }

    // OpenCV 4 人联机自主识别与高精度裁剪核心算法
    private object ClassifyCoop4(Mat fullMat, int? origW, int? origH)
    {
        int W = origW ?? fullMat.Width;
        int H = origH ?? fullMat.Height;
        double s = H / 1600.0; // 以 2560x1600 为基准的缩放比例

        var debugData = new Dictionary<string, object>
        {
            ["w"] = W,
            ["h"] = H,
            ["s"] = s,
            ["badges"] = new List<object>(),
            ["avatars"] = new List<object>()
        };

        // 1. 2560x1600 基准参数
        double baseBadgeX = 2424.0;
        double baseBadgeY1 = 513.0;
        double baseBadgeDistanceY = 90.5;
        double baseOffsetX = -55.0;
        double baseOffsetY = -33.0;
        double baseAvatarSize = 84.0;

        // 计算当前分辨率下的理论参数
        int targetX = (int)Math.Round(W - (2560.0 - baseBadgeX) * s);
        int targetY = (int)Math.Round((baseBadgeY1 + 3 * baseBadgeDistanceY) * s);
        int badgeW = (int)Math.Round(30 * s);
        int badgeH = (int)Math.Round(25 * s);
        int avatarSize = (int)Math.Round(baseAvatarSize * s);
        int offsetX = (int)Math.Round(baseOffsetX * s);
        int offsetY = (int)Math.Round(baseOffsetY * s);

        // 加载 1P-4P 的模板徽标（支持多尺度自适应）
        var badgeTemplates = new Dictionary<int, List<Mat>>();
        double[] scaleFactors = { 0.90, 0.95, 1.00, 1.05, 1.10 };
        var templatesDir = Path.Combine(Directory.GetCurrentDirectory(), "Assets", "PBadgeTemplates");
        for (int p = 1; p <= 4; p++)
        {
            var badgePath = Path.Combine(templatesDir, $"{p}p_badge.png");
            if (File.Exists(badgePath))
            {
                using var orig = Cv2.ImRead(badgePath);
                if (orig != null && !orig.Empty())
                {
                    var scalesList = new List<Mat>();
                    foreach (var factor in scaleFactors)
                    {
                        int w = (int)Math.Round(badgeW * factor);
                        int h = (int)Math.Round(badgeH * factor);
                        if (w > 0 && h > 0)
                        {
                            var resized = new Mat();
                            Cv2.Resize(orig, resized, new OpenCvSharp.Size(w, h));
                            scalesList.Add(resized);
                        }
                    }
                    badgeTemplates[p] = scalesList;
                }
            }
        }

        if (badgeTemplates.Count == 0)
        {
            _logger.LogWarning("未找到 1P-4P 任何徽标模板，无法执行识别。");
            return new { success = false, message = "缺少徽标模板文件", debugData };
        }

        // 2. 广域全图自适应寻找 1P-4P 的徽标位置
        var matchedLocations = new List<CoopPlayerPos>();
        int coopMatchCount = 0;
        double highestConf = 0.0;

        // 考虑到性能及避免左侧 UI 干扰，前端已经裁切了原图，我们直接在 fullMat (已是小图) 内搜索即可
        int searchX = 0;
        int searchY = 0;
        int searchW = fullMat.Width;
        int searchH = fullMat.Height;

        if (searchW <= 5 || searchH <= 5)
        {
            return new { success = false, message = "图片宽度不足无法执行搜索", debugData };
        }

        using var searchArea = fullMat.Clone();

        foreach (var kv in badgeTemplates)
        {
            int p = kv.Key;
            double bestVal = 0.0;
            OpenCvSharp.Point bestLoc = new OpenCvSharp.Point();

            foreach (var templateMat in kv.Value)
            {
                if (searchArea.Width < templateMat.Width || searchArea.Height < templateMat.Height)
                    continue;

                using var matchRes = new Mat();
                Cv2.MatchTemplate(searchArea, templateMat, matchRes, TemplateMatchModes.CCoeffNormed);
                Cv2.MinMaxLoc(matchRes, out _, out double maxVal, out _, out OpenCvSharp.Point maxLoc);

                if (maxVal > bestVal)
                {
                    bestVal = maxVal;
                    bestLoc = maxLoc;
                }
            }

            if (bestVal > highestConf) highestConf = bestVal;

            // 阈值设为 0.70，超过则判定在该位置找到了该徽标
            if (bestVal >= 0.70)
            {
                coopMatchCount++;
                matchedLocations.Add(new CoopPlayerPos
                {
                    Index = 0, // 稍后根据屏幕实际 Y 坐标重新编排顺位
                    MatchedP = p,
                    Confidence = bestVal,
                    X = searchX + bestLoc.X, // 还原为全图绝对坐标
                    Y = searchY + bestLoc.Y,
                    IsSelf = false
                });
            }
        }

        // 去重 (NMS)：由于 1P-4P 徽标存在一定的相似性，同一个物理位置可能会被多个模板以 >0.70 的置信度匹配到。
        // 我们通过 Y 坐标的像素距离来判断是否为同一位置，并只保留置信度最高的匹配。
        var nmsLocations = new List<CoopPlayerPos>();
        foreach (var loc in matchedLocations.OrderByDescending(l => l.Confidence))
        {
            // 如果目前收集到的结果中，没有任何一个跟它的 Y 距离过近（例如相距不足 20 像素），则采纳
            if (!nmsLocations.Any(existing => Math.Abs(loc.Y - existing.Y) < 20))
            {
                nmsLocations.Add(loc);
            }
        }
        matchedLocations = nmsLocations;
        coopMatchCount = matchedLocations.Count;

        // 释放所有多尺度模板句柄
        foreach (var list in badgeTemplates.Values)
        {
            foreach (var mat in list) mat.Dispose();
        }

        // 3. 判断联机状态阈值
        bool isCoop = coopMatchCount >= 2 || highestConf >= 0.82;

        // 对匹配到的徽标按照 Y 坐标从上到下排序，重新分配物理显示顺序（Index）
        matchedLocations = matchedLocations.OrderBy(l => l.Y).ToList();
        for (int i = 0; i < matchedLocations.Count; i++)
        {
            matchedLocations[i].Index = i + 1;
        }

        // 4. 联机模式逻辑：找出缺失的那一个 P 数，作为自己
        var foundPs = matchedLocations.Select(l => l.MatchedP).ToList();

        int selfP = 1;
        for (int p = 1; p <= 4; p++)
        {
            if (!foundPs.Contains(p))
            {
                selfP = p; break;
            }
        }

        bool isNormalBadgeStatus = foundPs.Distinct().Count() == 3 && foundPs.Count == 3;
        
        // 找到最下面的真实队友徽标，作为推算自己位置的绝对锚点
        var anchorLoc = matchedLocations.LastOrDefault();

        if (isNormalBadgeStatus)
        {
            // 给自己生成一个坐标位置对象
            double avgDistance = baseBadgeDistanceY * s;
            if (matchedLocations.Count >= 2)
            {
                double totalDist = 0;
                for (int k = 1; k < matchedLocations.Count; k++)
                {
                    totalDist += matchedLocations[k].Y - matchedLocations[k - 1].Y;
                }
                avgDistance = totalDist / (matchedLocations.Count - 1);
            }

            var selfPos = new CoopPlayerPos
            {
                Index = matchedLocations.Count + 1, // 自己永远在屏幕顺位最下方
                MatchedP = selfP,
                Confidence = 1.0,
                X = anchorLoc != null ? anchorLoc.X : targetX,
                Y = anchorLoc != null ? (int)Math.Round(anchorLoc.Y + avgDistance) : targetY,
                IsSelf = true
            };
            matchedLocations.Add(selfPos);
        }

        // 输出 debug 数据
        var badgeDebugList = new List<object>();
        foreach (var l in matchedLocations.Where(x => !x.IsSelf)) // 只画真正找到的徽标
        {
            badgeDebugList.Add(new
            {
                index = l.Index,
                p = l.MatchedP,
                confidence = l.Confidence,
                x = l.X,
                y = l.Y,
                badgeW = badgeW,
                badgeH = badgeH,
                searchX = searchX,
                searchY = searchY,
                searchW = searchW,
                searchH = searchH
            });
        }
        debugData["badges"] = badgeDebugList;

        // 5. 进行头像裁剪与 YOLO 角色识别
        var outputs = new List<object>(4);

        foreach (var loc in matchedLocations)
        {
            int ax, ay;
            if (loc.IsSelf)
            {
                if (anchorLoc != null)
                {
                    // 自己头像直接基于最下面的队友锚点进行计算偏移
                    ax = anchorLoc.X + (int)Math.Round(-82.0 * s);
                    ay = anchorLoc.Y + (int)Math.Round(160.5 * s);
                }
                else
                {
                    ax = loc.X + offsetX;
                    ay = loc.Y + offsetY;
                }
            }
            else
            {
                ax = loc.X + offsetX;
                ay = loc.Y + offsetY;
            }

            ax = Math.Clamp(ax, 0, W - 1);
            ay = Math.Clamp(ay, 0, H - 1);
            int aw = Math.Min(avatarSize, W - ax);
            int ah = Math.Min(avatarSize, H - ay);
            
            ((List<object>)debugData["avatars"]).Add(new { index = loc.Index, p = loc.MatchedP, isSelf = loc.IsSelf, x = ax, y = ay, w = aw, h = ah });
            
            if (!isCoop) continue;

            // 根据要求：如果徽标不是三个不一样的，自己的角色和缺少/重复的P数的角色直接返回空
            bool isNormal = foundPs.Distinct().Count() == 3 && foundPs.Count == 3;
            if (loc.IsSelf)
            {
                if (!isNormal)
                {
                    outputs.Add(new
                    {
                        index = loc.Index,
                        p = loc.MatchedP,
                        isSelf = loc.IsSelf,
                        success = false,
                        message = "徽标异常(缺少)，直接返回空"
                    });
                    continue;
                }
            }
            else
            {
                int count = foundPs.Count(p => p == loc.MatchedP);
                if (count != 1)
                {
                    outputs.Add(new
                    {
                        index = loc.Index,
                        p = loc.MatchedP,
                        isSelf = loc.IsSelf,
                        success = false,
                        message = "徽标异常(重复)，直接返回空"
                    });
                    continue;
                }
            }

            if (aw <= 5 || ah <= 5)
            {
                outputs.Add(new
                {
                    index = loc.Index,
                    p = loc.MatchedP,
                    isSelf = loc.IsSelf,
                    success = false,
                    message = "裁剪区域像素无效"
                });
                continue;
            }

            using var avatarMat = new Mat(fullMat, new Rect(ax, ay, aw, ah));
            var avatarBytes = avatarMat.ToBytes(".png");
            using var ms = new MemoryStream(avatarBytes);
            using var img = SixLabors.ImageSharp.Image.Load<Rgb24>(ms);

            var classification = _predictor.Value.Classify(img);
            var top = classification.GetTopClass();

            bool isRelax = top.Name.Name.StartsWith("Qin", StringComparison.Ordinal) || top.Name.Name.Contains("Costume");
            double threshold = isRelax ? 0.51 : 0.7;
            if (top.Confidence < threshold)
            {
                outputs.Add(new
                {
                    index = loc.Index,
                    p = loc.MatchedP,
                    isSelf = loc.IsSelf,
                    success = false,
                    message = $"置信度过低: {top.Confidence:F2}，结果: {top.Name.Name}",
                    predicted = top.Name.Name,
                    confidence = top.Confidence
                });
                continue;
            }

            var (cn, costumeCn) = _mapping.Map(top.Name.Name);
            outputs.Add(new
            {
                index = loc.Index,
                p = loc.MatchedP,
                isSelf = loc.IsSelf,
                success = true,
                predicted = top.Name.Name,
                confidence = top.Confidence,
                nameCn = cn,
                costumeCn,
                display = string.IsNullOrEmpty(costumeCn) ? cn : $"{cn}({costumeCn})"
            });
        }

        // 以 P 号升序排序，输出完美的 1P -> 4P 映射列表，极大提升可读性与后续数据流处理
        var sortedResults = outputs
            .Select(o => (dynamic)o)
            .OrderBy(o => (int)o.p)
            .ToList();

        if (!isCoop)
        {
            return new { success = false, message = $"未检测到满足特征的 4 人联机画面（最高置信度: {highestConf:F2}, 匹配数: {coopMatchCount}）", debugData };
        }

        return new
        {
            success = true,
            mode = "coop4",
            count = sortedResults.Count,
            results = sortedResults,
            debugData
        };
    }

    private class CoopPlayerPos
    {
        public int Index { get; set; }
        public int MatchedP { get; set; }
        public double Confidence { get; set; }
        public int X { get; set; }
        public int Y { get; set; }
        public bool IsSelf { get; set; }
    }

    public void Dispose()
    {
        if (_predictor.IsValueCreated)
        {
            _predictor.Value.Dispose();
        }
    }
}

