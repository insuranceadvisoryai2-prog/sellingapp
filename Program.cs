using System.Text;
using ECommerce.Data;
using ECommerce.Helpers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Npgsql.EntityFrameworkCore.PostgreSQL.NamingConventions;

var builder = WebApplication.CreateBuilder(args);

// ── 1. DATABASE (PostgreSQL via Supabase) ────────────────────────────────────
// Connection string is resolved from:
//   - appsettings.json (local dev)
//   - Environment variable DATABASE_URL on Render (production)
var connectionString =
    Environment.GetEnvironmentVariable("DATABASE_URL")           // Render env var
    ?? builder.Configuration.GetConnectionString("DefaultConnection") // appsettings
    ?? throw new InvalidOperationException("No connection string configured.");

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connectionString, npg =>
    {
        npg.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            null
        );
    })
);

// ── 2. JWT AUTHENTICATION ────────────────────────────────────────────────────
var jwtSection  = builder.Configuration.GetSection("JwtSettings");
var secretKey   = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
               ?? jwtSection["SecretKey"]!;
var issuer      = jwtSection["Issuer"]!;
var audience    = jwtSection["Audience"]!;

builder.Services
    .AddAuthentication(opts =>
    {
        opts.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opts.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = issuer,
            ValidAudience            = audience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew                = TimeSpan.Zero   // no grace period on expiry
        };
        opts.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                ctx.Response.Headers["Token-Expired"] =
                    ctx.Exception is SecurityTokenExpiredException ? "true" : "false";
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── 3. SERVICES ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<IJwtHelper, JwtHelper>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── 4. CORS ──────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                   ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(opts =>
    opts.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
    ));

// ── 5. SWAGGER ───────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "E-Commerce API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter: Bearer {your-token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── BUILD ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── 6. AUTO-MIGRATE ON STARTUP ───────────────────────────────────────────────
// Applies pending EF migrations automatically — safe for Render cold starts
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.Migrate();
        app.Logger.LogInformation("Database migration applied successfully.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database migration failed.");
        throw;
    }
}

// ── 7. MIDDLEWARE PIPELINE ───────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("FrontendPolicy");

app.UseAuthentication();   // must be before UseAuthorization
app.UseAuthorization();

app.MapControllers();

// Health check endpoint — Render uses this to verify the service is up
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();
