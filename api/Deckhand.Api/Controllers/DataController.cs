using Dapper;
using Npgsql;
using Microsoft.AspNetCore.Mvc;

namespace Deckhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DataController : ControllerBase
{
    private readonly string _connectionString;

    public DataController(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Supabase") 
            ?? throw new ArgumentNullException("Supabase connection string is missing.");
    }

    [HttpGet("{table}")]
    public async Task<IActionResult> GetTableData(string table)
    {
        // Whitelist allowed tables to prevent SQL injection
        var allowedTables = new[] { "jobs", "assets", "persons", "certifications", "locations", "maintenance_tasks", "asset_certifications", "drills" };
        if (!allowedTables.Contains(table.ToLower()))
            return BadRequest("Invalid table name.");

        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        var data = await connection.QueryAsync<dynamic>($"SELECT * FROM {table}");
        return Ok(data);
    }
}
