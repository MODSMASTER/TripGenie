const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
// Load destination database
const destinations = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, "data", "destinations.json"),
        "utf8"
    )
);

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to TripGenie AI Travel Assistant!");
});

// Test route
app.get("/test", (req, res) => {
    res.json({
        status: "success",
        message: "TripGenie backend is working!"
    });
});

// Destination recommendation API
app.get("/recommend", (req, res) => {

    const { category, scope } = req.query;

    if (!category || !scope) {
        return res.status(400).json({
            error: "Please provide category and scope."
        });
    }

    const results = destinations.filter(destination =>
        destination.category.toLowerCase() === category.toLowerCase() &&
        destination.scope.toLowerCase() === scope.toLowerCase()
    );

    res.json({
        total: results.length,
        recommendations: results
    });
});
// Dialogflow Webhook
app.post("/webhook", (req, res) => {
    console.log("Webhook request received!");

    const queryResult = req.body.queryResult;
    const intentName = queryResult.intent.displayName;
    console.log("Detected Intent:", intentName);
    const parameters = queryResult.parameters || {};
    const contexts = queryResult.outputContexts || [];

    console.log("Intent:", intentName);
    console.log("Parameters:", parameters);
    // Destination-specific Travel Tips
if (intentName === "TravelTipsIntent") {
    const destinationName = String(
        parameters.destination || ""
    ).toLowerCase();

    const travelTips = {
        manali: "Manali Travel Tips:\n1. Carry warm clothes.\n2. Check the weather before travelling.\n3. Visit Solang Valley and Hadimba Temple.\n4. Use authorised local transport.\n5. Keep some cash for local expenses.",

        shimla: "Shimla Travel Tips:\n1. Carry warm clothes.\n2. Wear comfortable walking shoes.\n3. Visit Mall Road and Kufri.\n4. Check road conditions before travelling.\n5. Book accommodation in advance.",

        goa: "Goa Travel Tips:\n1. Carry sunscreen and light clothes.\n2. Follow beach safety instructions.\n3. Visit Baga Beach and Fort Aguada.\n4. Stay hydrated.\n5. Respect local rules.",

        jaipur: "Jaipur Travel Tips:\n1. Wear comfortable clothes and shoes.\n2. Visit Amber Fort and Hawa Mahal.\n3. Carry water during sightseeing.\n4. Try local cuisine from hygienic places.\n5. Plan outdoor visits during cooler hours.",

        bali: "Bali Travel Tips:\n1. Carry light clothing.\n2. Respect local customs and temple rules.\n3. Visit Uluwatu Temple.\n4. Check local transport options.\n5. Keep your travel documents safe.",

        pokhara: "Pokhara Travel Tips:\n1. Carry comfortable outdoor clothing.\n2. Visit Phewa Lake and Sarangkot.\n3. Check weather conditions.\n4. Carry necessary travel documents.\n5. Follow local safety guidance.",

        paris: "Paris Travel Tips:\n1. Learn a few basic French phrases.\n2. Use public transport.\n3. Book popular attractions in advance.\n4. Keep your belongings secure.\n5. Check museum opening hours.",

        "maasai mara": "Maasai Mara Travel Tips:\n1. Carry comfortable neutral-coloured clothing.\n2. Follow your safari guide's instructions.\n3. Carry binoculars if available.\n4. Respect wildlife and maintain a safe distance.\n5. Check seasonal safari conditions."
    };

    return res.json({
        fulfillmentText:
            travelTips[destinationName] ||
            "Please select a destination from our available list."
    });
}
    console.log("Contexts:", JSON.stringify(contexts, null, 2));

    // Step 1: Receive travel preference
    if (intentName === "SelectDestinationPreferenceIntent") {
        return res.json({
            fulfillmentText:
                `Great choice! You selected ${parameters.travel_preference}. Would you like domestic or international destinations?`
        });
    }

    // Step 2: Receive travel scope and retrieve saved preference
    if (intentName === "SelectTravelScopeIntent") {

        const preferenceContext = contexts.find(context =>
            context.name.endsWith("/contexts/awaiting_travel_scope")
        );

        const preference =
            preferenceContext?.parameters?.travel_preference;

        const scope = parameters.travel_scope;

        if (!preference || !scope) {
            return res.json({
                fulfillmentText:
                    "I couldn't retrieve both your preferences. Please select your travel category again."
            });
        }

        const results = destinations.filter(destination =>
            destination.category.toLowerCase() ===
                String(preference).toLowerCase() &&
            (
                String(scope).toLowerCase() === "both" ||
                destination.scope.toLowerCase() ===
                    String(scope).toLowerCase()
            )
        );

        if (results.length === 0) {
            return res.json({
                fulfillmentText:
                    "Sorry, I couldn't find destinations matching your preferences."
            });
        }

        const message = results.map((destination, index) =>
            `${index + 1}. ${destination.name}, ${destination.country}. ` +
            `Best Season: ${destination.bestSeason}. ` +
            `Highlights: ${destination.highlights.join(", ")}`
        ).join("\n");

        return res.json({
            fulfillmentText:
                `Here are your recommended destinations:\n${message}`
        });
    }
// Budget Estimator
if (intentName === "BudgetEstimatorIntent") {

    const budget = Number(parameters.budget);

    if (!Number.isFinite(budget) || budget <= 0) {
        return res.json({
            fulfillmentText: "Please enter a valid budget in rupees."
        });
    }

    const results = destinations.filter(destination =>
        Number(destination.estimatedBudgetPerPerson) <= budget
    );

    if (results.length === 0) {
        return res.json({
            fulfillmentText:
                `Sorry, no destinations match your budget of ₹${budget.toLocaleString("en-IN")}. Try a higher budget.`
        });
    }

    const message = results.map((destination, index) =>
        `${index + 1}. ${destination.name}, ${destination.country} — ` +
        `Estimated budget: ₹${Number(destination.estimatedBudgetPerPerson).toLocaleString("en-IN")} per person.`
    ).join("\n");

    return res.json({
        fulfillmentText:
            `Destinations within your budget of ₹${budget.toLocaleString("en-IN")} for 3 days and 2 nights (indicative estimates):\n${message}`
    });
}
  // Itinerary Generator
if (intentName === "ItineraryGeneratorIntent") {

    const destinationName =
        parameters.destination || parameters["geo-city"];

    const destination = destinations.find(place =>
        place.name.toLowerCase() ===
        String(destinationName || "").toLowerCase()
    );

    if (!destination) {
        return res.json({
            fulfillmentText: "Sorry, I couldn't find that destination."
        });
    }
// Travel Tips
if (intentName === "TravelTipsIntent") {

    const destinationName =
        parameters.destination || parameters["geo-city"];

    const destination = destinations.find(place =>
        place.name.toLowerCase() ===
        String(destinationName || "").toLowerCase()
    );

    if (!destination) {
        return res.json({
            fulfillmentText:
                "Please mention a destination so I can provide useful travel tips."
        });
    }

    const tips = [
        `Best season to visit: ${destination.bestSeason}.`,
        `Explore these highlights: ${destination.highlights.join(" and ")}.`,
        "Check the weather forecast before packing.",
        "Carry suitable clothing and comfortable footwear.",
        "Keep your identification documents and important belongings secure.",
        "Respect local culture, customs and environmental rules.",
        "Plan your transport and accommodation in advance."
    ];

    return res.json({
        fulfillmentText:
            `Here are your travel tips for ${destination.name}:\n\n` +
            tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n")
    });
}
    const itinerary =
        `Your 3-day itinerary for ${destination.name}:\n\n` +
        `Day 1: Visit ${destination.highlights[0]}.\n` +
        `Day 2: Explore ${destination.highlights[1]}.\n` +
        `Day 3: Enjoy local food, shopping and sightseeing.\n\n` +
        `Best season: ${destination.bestSeason}`;

    return res.json({
        fulfillmentText: itinerary
    });
}  
res.json({
        fulfillmentText:
            "Welcome to TripGenie! How can I help you plan your trip?"
    });
});
// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`TripGenie server running on port ${PORT}`);
});
