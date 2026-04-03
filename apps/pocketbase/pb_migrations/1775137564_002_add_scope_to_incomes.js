/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("incomes");

  const existing = collection.fields.getByName("scope");
  if (existing) {
    if (existing.type === "select") {
      return;
    }
    collection.fields.removeByName("scope");
  }

  collection.fields.add(new SelectField({
    name: "scope",
    required: true,
    values: ["joint", "individual", "business"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("incomes");
  collection.fields.removeByName("scope");
  return app.save(collection);
})
