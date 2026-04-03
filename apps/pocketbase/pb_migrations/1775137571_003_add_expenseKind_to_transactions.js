/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("transactions");

  const existing = collection.fields.getByName("expenseKind");
  if (existing) {
    if (existing.type === "select") {
      return;
    }
    collection.fields.removeByName("expenseKind");
  }

  collection.fields.add(new SelectField({
    name: "expenseKind",
    required: false,
    values: ["fixed", "variable"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("transactions");
  collection.fields.removeByName("expenseKind");
  return app.save(collection);
})
