namespace Deckhand.Api.Models;

public class SyncActionDto
{
    public required string Id { get; set; }
    public required string Table { get; set; }
    public required string Payload { get; set; }
    public required int ClientVersion { get; set; }
}

public class SyncResponseDto
{
    public List<SyncResultDto> Results { get; set; } = new();
}

public class SyncResultDto
{
    public required string ActionId { get; set; }
    public required string Status { get; set; } // "applied" or "conflict"
    public int? NewVersion { get; set; } // Set if applied
    public object? ServerState { get; set; } // Set if conflict
    public object? ClientState { get; set; } // Set if conflict
}
