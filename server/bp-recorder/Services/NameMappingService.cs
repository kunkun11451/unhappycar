using System.Text.Json;

namespace AvatarSideClassifierWeb.Services;

public class NameMappingService
{
    private readonly Dictionary<string, string> _enToCn;
    private readonly Dictionary<string, string> _costumeMap;

    public NameMappingService(IWebHostEnvironment env, ILogger<NameMappingService> logger)
    {
        // Load combat_avatar.json from Assets
        var jsonPath = Path.Combine(env.ContentRootPath, "Assets", "combat_avatar.json");
        if (!File.Exists(jsonPath))
        {
            logger.LogWarning("Assets/combat_avatar.json not found at {Path}. Name mapping may fail.", jsonPath);
            _enToCn = new();
        }
        else
        {
            using var fs = File.OpenRead(jsonPath);
            var avatars = JsonSerializer.Deserialize<List<CombatAvatar>>(fs, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new();
            _enToCn = avatars.GroupBy(a => a.NameEn).ToDictionary(g => g.Key, g => g.First().Name);
        }

        // Costume map (ported minimal set)
        _costumeMap = new Dictionary<string, string>
        {
            { "Flamme", "殷红终夜" },
            { "Bamboo", "雨化竹身" },
            { "Dai", "冷花幽露" },
            { "Yu", "玄玉瑶芳" },
            { "Dancer", "帆影游风" },
            { "Witch", "琪花星烛" },
            { "Wic", "和谐" },
            { "Studentin", "叶隐芳名" },
            { "Fruhling", "花时来信" },
            { "Highness", "极夜真梦" },
            { "Feather", "霓裾翩跹" },
            { "Floral", "纱中幽兰" },
            { "Summertime", "闪耀协奏" },
            { "Sea", "海风之梦" },
        };
    }

    public (string cnName, string? costumeCn) Map(string yoloClass)
    {
        // Split Costume suffix e.g., "QinCostumeFlamme" -> nameEn=Qin, costume=Flamme
        string nameEn = yoloClass;
        string? costume = null;
        var idx = yoloClass.IndexOf("Costume", StringComparison.Ordinal);
        if (idx > 0)
        {
            nameEn = yoloClass[..idx];
            costume = yoloClass[(idx + "Costume".Length)..];
        }

        if (!_enToCn.TryGetValue(nameEn, out var cn))
        {
            // fallback: return original
            cn = nameEn;
        }

        string? costumeCn = null;
        if (!string.IsNullOrEmpty(costume) && _costumeMap.TryGetValue(costume, out var mapped))
        {
            costumeCn = mapped;
        }

        return (cn, costumeCn);
    }

    private record CombatAvatar(string Name, string NameEn);
}
