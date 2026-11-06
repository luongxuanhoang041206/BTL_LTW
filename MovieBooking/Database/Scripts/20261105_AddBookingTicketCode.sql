IF COL_LENGTH(N'dbo.Bookings', N'TicketCode') IS NULL
BEGIN
    ALTER TABLE dbo.Bookings
        ADD TicketCode VARCHAR(30) NULL;
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_Bookings_TicketCode'
      AND object_id = OBJECT_ID(N'dbo.Bookings')
)
BEGIN
    CREATE UNIQUE INDEX UX_Bookings_TicketCode
        ON dbo.Bookings(TicketCode)
        WHERE TicketCode IS NOT NULL;
END;
GO
