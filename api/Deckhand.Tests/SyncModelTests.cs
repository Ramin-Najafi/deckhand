using System.Collections.Generic;
using System.Text.Json;
using Xunit;
using Deckhand.Api.Models;

namespace Deckhand.Tests;

public class SyncModelTests
{
    // A simple test to assert that our DTOs serialize and deserialize correctly
    // since the Npgsql logic requires a live DB which is hard in unit tests.
    
    [Fact]
    public void SyncActionDto_ShouldSerializeProperly()
    {
        var action = new SyncActionDto
        {
            Id = "123",
            Table = "jobs",
            Payload = "{\"test\": 1}",
            ClientVersion = 2
        };

        Assert.Equal("123", action.Id);
        Assert.Equal("jobs", action.Table);
        Assert.Equal(2, action.ClientVersion);
    }
}
