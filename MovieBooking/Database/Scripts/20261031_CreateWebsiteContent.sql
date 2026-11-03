IF OBJECT_ID(N'dbo.WebsiteContent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebsiteContent
    (
        ContentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteContent PRIMARY KEY,
        ContentKey NVARCHAR(50) NOT NULL CONSTRAINT UQ_WebsiteContent_ContentKey UNIQUE,
        DraftJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_WebsiteContent_DraftJson DEFAULT N'{}',
        PublishedJson NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_WebsiteContent_UpdatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedByUserId INT NULL,
        PublishedAt DATETIME2 NULL,
        CONSTRAINT FK_WebsiteContent_Users FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
    );
END;
GO
