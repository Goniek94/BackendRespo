const mongoose = require("mongoose");

mongoose
  .connect(
    "mongodb+srv://waldemarkorepetycje:Nelusia321.@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz"
  )
  .then(async () => {
    const Ad = mongoose.model("Ad", new mongoose.Schema({}, { strict: false }));

    console.log("=== WSZYSTKIE KOLORY W BAZIE (aktywne) ===");
    const colors = await Ad.aggregate([
      {
        $match: {
          status: { $in: ["active", "opublikowane", "pending", "approved"] },
        },
      },
      { $match: { color: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$color", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    colors.forEach((c) => console.log(`'${c._id}' => ${c.count} ogłoszeń`));

    console.log("\n=== TEST FILTROWANIA: SREBRNY (case-insensitive) ===");
    const srebrne = await Ad.find({
      status: { $in: ["active", "opublikowane", "pending", "approved"] },
      color: { $regex: new RegExp("^SREBRNY$", "i") },
    }).limit(10);

    console.log(`Znaleziono: ${srebrne.length} ogłoszeń`);
    srebrne.forEach((ad) =>
      console.log(`- ${ad.brand} ${ad.model}, kolor: '${ad.color}'`)
    );

    console.log("\n=== TEST FILTROWANIA: Biały (case-insensitive) ===");
    const biale = await Ad.find({
      status: { $in: ["active", "opublikowane", "pending", "approved"] },
      color: { $regex: new RegExp("^Biały$", "i") },
    }).limit(10);

    console.log(`Znaleziono: ${biale.length} ogłoszeń`);
    biale.forEach((ad) =>
      console.log(`- ${ad.brand} ${ad.model}, kolor: '${ad.color}'`)
    );

    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Błąd:", err);
    process.exit(1);
  });
