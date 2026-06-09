using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ECommerce.Models;
using Microsoft.IdentityModel.Tokens;

namespace ECommerce.Helpers;

public interface IJwtHelper
{
    (string token, DateTime expiresAt) GenerateToken(User user);
}

public class JwtHelper : IJwtHelper
{
    private readonly IConfiguration _config;

    public JwtHelper(IConfiguration config) => _config = config;

    public (string token, DateTime expiresAt) GenerateToken(User user)
    {
        var settings   = _config.GetSection("JwtSettings");
        var secret     = settings["SecretKey"]!;
        var issuer     = settings["Issuer"]!;
        var audience   = settings["Audience"]!;
        var expiryMins = int.Parse(settings["ExpiryMinutes"] ?? "1440");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var exp   = DateTime.UtcNow.AddMinutes(expiryMins);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username",                     user.Username),
            new Claim(ClaimTypes.Role,                user.Role),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            exp,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), exp);
    }
}

// Extension helpers used in controllers
public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
               ?? throw new InvalidOperationException("UserId claim missing");
        return Guid.Parse(raw);
    }

    public static string GetRole(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimTypes.Role) ?? "Customer";
}
