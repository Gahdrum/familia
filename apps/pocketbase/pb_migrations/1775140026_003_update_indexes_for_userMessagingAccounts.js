/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("userMessagingAccounts");
  collection.indexes.push("CREATE UNIQUE INDEX idx_userMessagingAccounts_telegramId ON userMessagingAccounts (telegramId)");
  collection.indexes.push("CREATE UNIQUE INDEX idx_userMessagingAccounts_whatsappPhone ON userMessagingAccounts (whatsappPhone)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("userMessagingAccounts");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_userMessagingAccounts_telegramId"));
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_userMessagingAccounts_whatsappPhone"));
  return app.save(collection);
})
