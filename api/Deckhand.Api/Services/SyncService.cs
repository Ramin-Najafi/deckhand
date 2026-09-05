using Dapper;
using Npgsql;
using System.Text.Json;
using Deckhand.Api.Models;

namespace Deckhand.Api.Services;

public class SyncService
{
    private readonly string _connectionString;

    public SyncService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Supabase") 
            ?? throw new ArgumentNullException("Supabase connection string is missing.");
    }

    public async Task<SyncResponseDto> ProcessSyncBatchAsync(List<SyncActionDto> actions)
    {
        var response = new SyncResponseDto();
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        foreach (var action in actions)
        {
            var result = await ProcessSingleActionAsync(connection, action);
            response.Results.Add(result);
        }

        return response;
    }

    private async Task<SyncResultDto> ProcessSingleActionAsync(NpgsqlConnection connection, SyncActionDto action)
    {
        // A simple query to get the current version and the full row as JSON
        var query = $@"
            SELECT version, row_to_json(t) as Data 
            FROM {action.Table} t 
            WHERE id = @Id";

        var currentRecord = await connection.QuerySingleOrDefaultAsync<dynamic>(query, new { Id = Guid.Parse(action.Id) });

        if (currentRecord == null)
        {
            // If the record doesn't exist, we treat it as an insert (client_version usually 0 or 1).
            // For this minimal demo, we'll assume updates to existing records only, 
            // but we could handle inserts here.
            return new SyncResultDto 
            { 
                ActionId = action.Id, 
                Status = "error_not_found" 
            };
        }

        int currentVersion = currentRecord.version;

        if (action.ClientVersion >= currentVersion)
        {
            // Client is up to date, apply the update.
            int newVersion = currentVersion + 1;
            
            // We deserialize the payload, inject the new version, and build an UPDATE statement dynamically.
            var payloadDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(action.Payload);
            if (payloadDict == null) throw new Exception("Invalid payload");

            payloadDict["version"] = JsonSerializer.SerializeToElement(newVersion);
            payloadDict["updated_at"] = JsonSerializer.SerializeToElement(DateTime.UtcNow);

            var setClauses = new List<string>();
            var parameters = new DynamicParameters();
            parameters.Add("Id", Guid.Parse(action.Id));

            foreach (var kvp in payloadDict)
            {
                if (kvp.Key == "id" || kvp.Key == "_syncStatus") continue; // Don't update ID or internal fields
                
                setClauses.Add($"{kvp.Key} = @{kvp.Key}");
                
                // Extract value appropriately
                if (kvp.Value.ValueKind == JsonValueKind.String)
                {
                    if (Guid.TryParse(kvp.Value.GetString(), out var guidValue))
                        parameters.Add(kvp.Key, guidValue);
                    else
                        parameters.Add(kvp.Key, kvp.Value.GetString());
                }
                else if (kvp.Value.ValueKind == JsonValueKind.Number)
                    parameters.Add(kvp.Key, kvp.Value.GetInt32());
                else if (kvp.Value.ValueKind == JsonValueKind.True || kvp.Value.ValueKind == JsonValueKind.False)
                    parameters.Add(kvp.Key, kvp.Value.GetBoolean());
                else if (kvp.Value.ValueKind == JsonValueKind.Null)
                    parameters.Add(kvp.Key, null);
                else
                    parameters.Add(kvp.Key, kvp.Value.ToString());
            }

            var updateQuery = $"UPDATE {action.Table} SET {string.Join(", ", setClauses)} WHERE id = @Id";
            await connection.ExecuteAsync(updateQuery, parameters);

            return new SyncResultDto 
            { 
                ActionId = action.Id, 
                Status = "applied", 
                NewVersion = newVersion 
            };
        }
        else
        {
            // Conflict detected!
            // The server has a newer version than what the client based its edit on.
            var serverState = JsonSerializer.Deserialize<object>(currentRecord.data);
            var clientState = JsonSerializer.Deserialize<object>(action.Payload);

            return new SyncResultDto 
            { 
                ActionId = action.Id, 
                Status = "conflict", 
                ServerState = serverState,
                ClientState = clientState
            };
        }
    }
}
