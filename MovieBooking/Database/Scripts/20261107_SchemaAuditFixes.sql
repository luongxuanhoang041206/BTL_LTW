-- Applies the schema fixes verified by the MovieBooking audit.
-- Safe to re-run. Does not delete booking, payment, or catalog rows.

USE MovieBookingDB;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.BookingFoods', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BookingFoods (
        BookingFoodId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BookingFoods PRIMARY KEY,
        BookingId INT NOT NULL,
        FoodItemId INT NOT NULL,
        FoodName NVARCHAR(150) NOT NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_BookingFoods_Bookings FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId) ON DELETE CASCADE,
        CONSTRAINT FK_BookingFoods_FoodItems FOREIGN KEY (FoodItemId) REFERENCES dbo.FoodItems(FoodItemId),
        CONSTRAINT CK_BookingFoods_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_BookingFoods_UnitPrice CHECK (UnitPrice >= 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BookingFoods_BookingId' AND object_id = OBJECT_ID(N'dbo.BookingFoods'))
    CREATE INDEX IX_BookingFoods_BookingId ON dbo.BookingFoods(BookingId);
GO

IF OBJECT_ID(N'dbo.BankTransactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankTransactions (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BankTransactions PRIMARY KEY,
        ProviderTransactionId BIGINT NOT NULL,
        ReferenceCode NVARCHAR(100) NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Content NVARCHAR(500) NULL,
        PaymentId INT NULL,
        Result NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BankTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_BankTransactions_Payments FOREIGN KEY (PaymentId) REFERENCES dbo.Payments(PaymentId) ON DELETE SET NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BankTransactions_ProviderTransactionId' AND object_id = OBJECT_ID(N'dbo.BankTransactions'))
    CREATE UNIQUE INDEX IX_BankTransactions_ProviderTransactionId ON dbo.BankTransactions(ProviderTransactionId);
GO

IF COL_LENGTH(N'dbo.BookingCombos', N'ComboName') IS NULL
BEGIN
    ALTER TABLE dbo.BookingCombos ADD ComboName NVARCHAR(150) NULL;
    EXEC(N'
        UPDATE bc
        SET ComboName = c.Name
        FROM dbo.BookingCombos bc
        INNER JOIN dbo.Combos c ON c.ComboId = bc.ComboId
        WHERE bc.ComboName IS NULL;
        UPDATE dbo.BookingCombos SET ComboName = N'''' WHERE ComboName IS NULL;
    ');
    ALTER TABLE dbo.BookingCombos ALTER COLUMN ComboName NVARCHAR(150) NOT NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BookingCombos_BookingId' AND object_id = OBJECT_ID(N'dbo.BookingCombos'))
    CREATE INDEX IX_BookingCombos_BookingId ON dbo.BookingCombos(BookingId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BookingDetails_BookingId' AND object_id = OBJECT_ID(N'dbo.BookingDetails'))
    CREATE INDEX IX_BookingDetails_BookingId ON dbo.BookingDetails(BookingId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Payments_BookingId' AND object_id = OBJECT_ID(N'dbo.Payments'))
    CREATE INDEX IX_Payments_BookingId ON dbo.Payments(BookingId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Payments_OneSuccessPerBooking' AND object_id = OBJECT_ID(N'dbo.Payments'))
    CREATE UNIQUE INDEX UX_Payments_OneSuccessPerBooking ON dbo.Payments(BookingId) WHERE PaymentStatus = 'Success';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ShowtimeSeats_Hold' AND object_id = OBJECT_ID(N'dbo.ShowtimeSeats'))
    CREATE INDEX IX_ShowtimeSeats_Hold ON dbo.ShowtimeSeats(Status, HoldExpiresAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Showtimes_RoomId_ShowDate_StartTime' AND object_id = OBJECT_ID(N'dbo.Showtimes'))
    CREATE INDEX IX_Showtimes_RoomId_ShowDate_StartTime ON dbo.Showtimes(RoomId, ShowDate, StartTime);
GO

DECLARE @drop nvarchar(max);

SELECT @drop = N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(name)
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
  AND definition LIKE N'%Role%'
  AND name <> N'CK_Users_Role';
IF @drop IS NOT NULL EXEC sp_executesql @drop;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Users_Role' AND parent_object_id = OBJECT_ID(N'dbo.Users'))
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('Customer', 'Admin', 'Staff'));
GO

DECLARE @drop nvarchar(max);

SELECT @drop = N'ALTER TABLE dbo.Payments DROP CONSTRAINT ' + QUOTENAME(name)
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(N'dbo.Payments')
  AND definition LIKE N'%PaymentStatus%'
  AND name <> N'CK_Payments_PaymentStatus';
IF @drop IS NOT NULL EXEC sp_executesql @drop;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Payments_PaymentStatus' AND parent_object_id = OBJECT_ID(N'dbo.Payments'))
    ALTER TABLE dbo.Payments ADD CONSTRAINT CK_Payments_PaymentStatus
        CHECK (PaymentStatus IN ('Pending', 'Success', 'Failed', 'PaidNeedRefund'));
GO

DECLARE @drop nvarchar(max);

SELECT @drop = N'ALTER TABLE dbo.Reviews DROP CONSTRAINT ' + QUOTENAME(name)
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(N'dbo.Reviews')
  AND definition LIKE N'%Rating%'
  AND name <> N'CK_Reviews_Rating';
IF @drop IS NOT NULL EXEC sp_executesql @drop;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Reviews_Rating' AND parent_object_id = OBJECT_ID(N'dbo.Reviews'))
    ALTER TABLE dbo.Reviews ADD CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 10);
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Reviews')
      AND name = N'Comment'
      AND max_length <> -1
)
    ALTER TABLE dbo.Reviews ALTER COLUMN Comment NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Promotions_DateRange' AND parent_object_id = OBJECT_ID(N'dbo.Promotions'))
    ALTER TABLE dbo.Promotions ADD CONSTRAINT CK_Promotions_DateRange CHECK (EndDate >= StartDate);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Showtimes_TimeRange' AND parent_object_id = OBJECT_ID(N'dbo.Showtimes'))
    ALTER TABLE dbo.Showtimes ADD CONSTRAINT CK_Showtimes_TimeRange CHECK (EndTime > StartTime);
GO
