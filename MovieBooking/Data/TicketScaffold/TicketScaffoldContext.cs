using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using MovieBooking.Models;

namespace MovieBooking.Data.TicketScaffold;

public partial class TicketScaffoldContext : DbContext
{
    public TicketScaffoldContext(DbContextOptions<TicketScaffoldContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Ticket> Tickets { get; set; }

    public virtual DbSet<TicketCheckInLog> TicketCheckInLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.HasIndex(e => e.BookingDetailId, "UQ_Tickets_BookingDetailId").IsUnique();

            entity.HasIndex(e => e.Qrtoken, "UX_Tickets_QRToken").IsUnique();

            entity.HasIndex(e => e.TicketCode, "UX_Tickets_TicketCode").IsUnique();

            entity.Property(e => e.IssuedAt).HasDefaultValueSql("(sysdatetime())", "DF_Tickets_IssuedAt");
            entity.Property(e => e.Qrtoken)
                .HasMaxLength(128)
                .IsUnicode(false)
                .HasColumnName("QRToken");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Issued", "DF_Tickets_Status");
            entity.Property(e => e.TicketCode)
                .HasMaxLength(40)
                .IsUnicode(false);
        });

        modelBuilder.Entity<TicketCheckInLog>(entity =>
        {
            entity.HasKey(e => e.LogId);

            entity.HasIndex(e => e.StaffId, "IX_TicketCheckInLogs_StaffId");

            entity.HasIndex(e => e.TicketId, "IX_TicketCheckInLogs_TicketId");

            entity.Property(e => e.Action)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysdatetime())", "DF_TicketCheckInLogs_CreatedAt");
            entity.Property(e => e.Message).HasMaxLength(255);

            entity.HasOne(d => d.Ticket).WithMany(p => p.TicketCheckInLogs)
                .HasForeignKey(d => d.TicketId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TicketCheckInLogs_Tickets");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
