export const Config = {
    MongoUri: 'mongodb://localhost:27018,localhost:27019,localhost:27020',
    MongoConfig: {
        replicaSet: 'rs0',
        useNewUrlParser: true, 
        useUnifiedTopology: true
    },
    MongoDatabase: 'shopping-cart',
    Port: 3000,
    ServerUrl: 'http://localhost:3000',
    ClientWebUrl: 'http://localhost:4000',

    SmtpHost: 'smtp.office365.com',
    SmtpPort: 587,
    SenderAddress: '"Prompt Post" <promptpost@thailandpostprivilege.com>',
    AuthUser: 'promptpost@thailandpostprivilege.com',
    AuthPassword: 'Wh1t#d0g412030',

    FilePath: '/files',
    PageSize: 10,
    ExpiresIn: 3600 * 100,

    FileDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/public',
    LogDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/log',
    DataDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/data',

    AppName: 'Shopping Cart API',

    Version: {
        base: 0,
        major: 0,
        minor: 1
    }
};

export const ConfigTest = {
    MongoUri: 'mongodb://localhost:27017,localhost:27018,localhost:27019',
    MongoConfig: {
        replicaSet: 'rs0',
        useNewUrlParser: true, 
        useUnifiedTopology: true
    },
    MongoDatabase: 'shopping-cart_test',
    Port: 3001,
    ServerUrl: 'http://localhost:3000',
    ClientWebUrl: 'http://localhost:4000',

    FilePath: '/files',
    PageSize: 10,
    ExpiresIn: 3600 * 100,

    FileDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/test/public',
    LogDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/test/log',
    DataDir: 'D:/Workspace/Senate/Prompt Post V2/prompt-post_api/test/data',

    AppName: 'Shopping Cart Test',

    Version: {
        base: 0,
        major: 0,
        minor: 1
    }
};

