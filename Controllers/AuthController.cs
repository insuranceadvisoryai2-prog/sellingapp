using ECommerce.Data;
using ECommerce.DTOs;
using ECommerce.Helpers;
using ECommerce.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ECommerce.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJwtHelper   _jwt;
    private readonly ILogger<AuthController> _log;

    public AuthController(AppDbContext db, IJwtHelper jwt, ILogger<AuthController> log)
    {
        _db  = db;
        _jwt = jwt;
        _log = log;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) ||
            string.IsNullOrWhiteSpace(req.Email)    ||
            string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new ApiError(false, "Username, Email and Password are required."));

        if (req.Password.Length < 8)
            return BadRequest(new ApiError(false, "Password must be at least 8 characters."));

        var exists = await _db.Users
            .AnyAsync(u => u.Username == req.Username || u.Email == req.Email);

        if (exists)
            return Conflict(new ApiError(false, "Username or Email already in use."));

        var user = new User
        {
            Username     = req.Username.Trim(),
            Email        = req.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = "Customer"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _log.LogInformation("New user registered: {Username}", user.Username);

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Ok(new ApiResponse<AuthResponse>(true, "Registered successfully.",
            new AuthResponse(token, user.Username, user.Email, user.Role, expiresAt)));
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new ApiError(false, "Username and Password are required."));

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new ApiError(false, "Invalid credentials."));

        _log.LogInformation("User logged in: {Username}", user.Username);

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Ok(new ApiResponse<AuthResponse>(true, "Login successful.",
            new AuthResponse(token, user.Username, user.Email, user.Role, expiresAt)));
    }
}
