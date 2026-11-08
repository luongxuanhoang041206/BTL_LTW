using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using MovieBooking.Data;

namespace MovieBooking.Tests.Helpers;

public sealed class SqliteTestDatabase : IDisposable
{
    private readonly SqliteConnection _connection;
    public MovieBookingContext Context { get; }

    public SqliteTestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MovieBookingContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new SqliteMovieBookingContext(options);
        Context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }

    private sealed class SqliteMovieBookingContext : MovieBookingContext
    {
        public SqliteMovieBookingContext(DbContextOptions<MovieBookingContext> options)
            : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            foreach (var entity in modelBuilder.Model.GetEntityTypes().ToList())
            {
                entity.SetSchema(null);

                foreach (var property in entity.GetProperties())
                {
                    property.SetColumnType(null);
                    property.SetDefaultValueSql(null);
                    property.SetComputedColumnSql(null);
                }
            }
        }
    }
}