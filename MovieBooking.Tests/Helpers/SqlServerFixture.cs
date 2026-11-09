using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Data;
using Respawn;

namespace MovieBooking.Tests.Helpers;

public sealed class SqlServerFixture : IAsyncLifetime
{
    private readonly string _dbName = $"MovieBooking_Test_{Guid.NewGuid():N}";
    private Respawner _respawner = null!;

    public string ConnectionString =>$"Server=(localdb)\\mssqllocaldb;Database={_dbName};Trusted_Connection=True;MultipleActiveResultSets=true";

    public MovieBookingContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<MovieBookingContext>()
            .UseSqlServer(ConnectionString)
            .Options;
        return new MovieBookingContext(options);
    }

    public async Task InitializeAsync()
    {
        await using (var db = CreateContext())
            await db.Database.EnsureCreatedAsync();

        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        _respawner = await Respawner.CreateAsync(conn, new RespawnerOptions
        {
            DbAdapter = DbAdapter.SqlServer,
            TablesToIgnore = [new Respawn.Graph.Table("__EFMigrationsHistory")]
        });
    }

    public async Task ResetAsync()
    {
        await using var conn = new SqlConnection(ConnectionString);
        await conn.OpenAsync();
        await _respawner.ResetAsync(conn);
    }

    public async Task DisposeAsync()
    {
        await using var db = CreateContext();
        await db.Database.EnsureDeletedAsync();
    }
}

[CollectionDefinition("SqlServer")]
public class SqlServerCollection : ICollectionFixture<SqlServerFixture> { }