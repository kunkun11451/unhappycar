using AvatarSideClassifierWeb.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Allow large uploads (up to ~20MB)
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 20 * 1024 * 1024;
});

builder.Services.AddSingleton<NameMappingService>();
builder.Services.AddSingleton<AvatarClassifierService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.MapPost("/api/classify", async (HttpRequest req, AvatarClassifierService svc) =>
{
    if (!req.HasFormContentType) return Results.BadRequest(new { error = "form-data required" });
    var form = await req.ReadFormAsync();
    var file = form.Files["file"];
    if (file is null || file.Length == 0) return Results.BadRequest(new { error = "file missing" });
    var mode = form["mode"].ToString();
    
    int? origW = null, origH = null;
    if (form.TryGetValue("origW", out var wStr) && int.TryParse(wStr, out var w)) origW = w;
    if (form.TryGetValue("origH", out var hStr) && int.TryParse(hStr, out var h)) origH = h;

    using var stream = file.OpenReadStream();
    if (string.Equals(mode, "team", StringComparison.OrdinalIgnoreCase))
    {
        var resultTeam = await svc.ClassifyTeamAsync(stream, origW, origH);
        return Results.Ok(resultTeam);
    }
    else
    {
        var result = await svc.ClassifyAsync(stream);
        return Results.Ok(result);
    }
});

app.MapPost("/api/classify-batch", async (HttpRequest req, AvatarClassifierService svc) =>
{
    if (!req.HasFormContentType) return Results.BadRequest(new { error = "form-data required" });
    var form = await req.ReadFormAsync();
    if (form.Files.Count == 0) return Results.BadRequest(new { error = "no files" });

    // 以文件名排序，a1..a4 或任意顺序都可
    var files = form.Files.OrderBy(f => f.Name).ThenBy(f => f.FileName).ToList();
    var results = new List<object>(files.Count);
    for (int i = 0; i < files.Count; i++)
    {
        var f = files[i];
        await using var stream = f.OpenReadStream();
        var r = await svc.ClassifyAsync(stream);
        results.Add(new { index = i + 1, result = r });
    }

    return Results.Ok(new { mode = "batch", count = results.Count, results });
});

app.Run();
