using Microsoft.AspNetCore.Mvc;
using Deckhand.Api.Models;
using Deckhand.Api.Services;

namespace Deckhand.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly SyncService _syncService;

    public SyncController(SyncService syncService)
    {
        _syncService = syncService;
    }

    [HttpPost]
    public async Task<IActionResult> PostSyncBatch([FromBody] List<SyncActionDto> actions)
    {
        if (actions == null || actions.Count == 0)
            return BadRequest("Empty sync batch.");

        try
        {
            var result = await _syncService.ProcessSyncBatchAsync(actions);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
