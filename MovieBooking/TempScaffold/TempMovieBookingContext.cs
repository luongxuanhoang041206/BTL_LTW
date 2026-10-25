using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using MovieBooking.TempScaffold.Models;

namespace MovieBooking.TempScaffold;

public partial class TempMovieBookingContext : DbContext
{
    public TempMovieBookingContext(DbContextOptions<TempMovieBookingContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<SystemSetting> SystemSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.LogId);

            entity.HasIndex(e => e.CreatedAt, "IX_AuditLogs_CreatedAt");

            entity.Property(e => e.Action).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysdatetime())", "DF_AuditLogs_CreatedAt");
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Success", "DF_AuditLogs_Status");
            entity.Property(e => e.Target).HasMaxLength(200);
        });

        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.HasKey(e => e.SettingId);

            entity.HasIndex(e => e.SettingKey, "UQ_SystemSettings_SettingKey").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.SettingKey).HasMaxLength(100);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysdatetime())", "DF_SystemSettings_UpdatedAt");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
