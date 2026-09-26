/* =========================================
   FIND BACK - LOST & FOUND LOCAL
   Frontend Demo
========================================= */


/* =========================================
   SAMPLE DATA
========================================= */

const defaultItems = [

    {
        id: 1,
        type: "LOST",
        title: "Black Samsung Phone",
        category: "Electronics",
        location: "Library",
        date: "2026-09-25",
        time: "15:30",
        description:
            "Black Samsung phone with a dark blue case.",
        reward: 10,
        status: "ACTIVE",
        icon: "📱"
    },

    {
        id: 2,
        type: "FOUND",
        title: "Blue Backpack",
        category: "Bags",
        location: "Canteen",
        date: "2026-09-25",
        time: "13:00",
        description:
            "Blue backpack found near the canteen entrance.",
        reward: 10,
        status: "ACTIVE",
        icon: "🎒"
    },

    {
        id: 3,
        type: "LOST",
        title: "College ID Card",
        category: "Documents",
        location: "Block A",
        date: "2026-09-24",
        time: "10:30",
        description:
            "College ID card lost near Block A.",
        reward: 10,
        status: "ACTIVE",
        icon: "🪪"
    },

    {
        id: 4,
        type: "FOUND",
        title: "Car Keys",
        category: "Keys",
        location: "Parking",
        date: "2026-09-25",
        time: "09:15",
        description:
            "Set of car keys found in the parking area.",
        reward: 10,
        status: "ACTIVE",
        icon: "🔑"
    }

];


/* =========================================
   LOAD DATA
========================================= */

const supabaseClient =
    window.supabase &&
    window.FINDBACK_SUPABASE_URL &&
    window.FINDBACK_SUPABASE_ANON_KEY
        ? window.supabase.createClient(
            window.FINDBACK_SUPABASE_URL,
            window.FINDBACK_SUPABASE_ANON_KEY
        )
        : null;

let items =
    JSON.parse(localStorage.getItem("findback_items"))
    || defaultItems;

let currentUser = null;
let categories = [];
let locations = [];
let selectedType = "LOST";


/* =========================================
   SAVE DATA
========================================= */

function saveItems() {

    if (supabaseClient) return;

    localStorage.setItem(
        "findback_items",
        JSON.stringify(items)
    );

}


/* =========================================
   CATEGORY ICON
========================================= */

function getCategoryIcon(category) {

    const icons = {

        Electronics: "📱",

        Documents: "🪪",

        Wallets: "👛",

        Keys: "🔑",

        Bags: "🎒",

        Clothing: "👕",

        Books: "📚",

        Accessories: "⌚",

        Other: "📦"

    };

    return icons[category] || "📦";

}


/* =========================================
   RENDER ITEMS
========================================= */

function renderItems() {

    const grid =
        document.getElementById("itemsGrid");

    const empty =
        document.getElementById("emptyState");

    const search =
        document
        .getElementById("searchInput")
        .value
        .toLowerCase();

    const type =
        document.getElementById("typeFilter").value;

    const category =
        document.getElementById("categoryFilter").value;


    const filteredItems = items.filter(item => {

        const matchesSearch =
            item.title.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search) ||
            item.location.toLowerCase().includes(search);

        const matchesType =
            type === "ALL" ||
            item.type === type;

        const matchesCategory =
            category === "ALL" ||
            item.category === category;

        return (
            matchesSearch &&
            matchesType &&
            matchesCategory
        );

    });


    grid.innerHTML = "";


    if (filteredItems.length === 0) {

        empty.style.display = "block";

        return;

    }


    empty.style.display = "none";


    filteredItems.forEach(item => {

        const card =
            document.createElement("div");

        card.className = "item-card";


        card.innerHTML = `

            <div class="item-image">

                ${item.icon || getCategoryIcon(item.category)}

            </div>


            <div class="item-body">

                <span class="item-status
                    ${item.type === "LOST"
                        ? "status-lost"
                        : "status-found"}">

                    ${item.type === "LOST"
                        ? "🔴 LOST"
                        : "🟢 FOUND"}

                </span>


                <h3>
                    ${escapeHTML(item.title)}
                </h3>


                <div class="item-meta">

                    📍 ${escapeHTML(item.location)}
                    <br>

                    🕐 ${item.time || "Time unknown"}
                    <br>

                    🏷️ ${escapeHTML(item.category)}

                </div>


                <div class="item-footer">

                    <span class="reward">

                        💰 ₹${Number(item.reward).toFixed(0)}

                    </span>


                    <button
                        class="view-btn"
                        onclick="viewItem('${item.id}')">

                        View

                    </button>

                </div>

            </div>

        `;


        grid.appendChild(card);

    });


    updateStats();

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

}


/* =========================================
   OPEN POST MODAL
========================================= */

function openPostModal(type = "LOST") {

    if (supabaseClient && !currentUser) {
        openProfile();
        return;
    }

    selectedType = type;

    selectType(type);

    document
        .getElementById("postModal")
        .classList.add("show");

}


/* =========================================
   CLOSE POST MODAL
========================================= */

function closePostModal() {

    document
        .getElementById("postModal")
        .classList.remove("show");

}


/* =========================================
   SELECT LOST / FOUND
========================================= */

function selectType(type) {

    selectedType = type;


    const lost =
        document.getElementById("lostType");

    const found =
        document.getElementById("foundType");


    lost.classList.remove("active-lost");

    found.classList.remove("active-found");


    if (type === "LOST") {

        lost.classList.add("active-lost");

    } else {

        found.classList.add("active-found");

    }

}


/* =========================================
   SUBMIT ITEM
========================================= */

document
    .getElementById("postForm")
    .addEventListener("submit", async function(event) {

        event.preventDefault();


        const title =
            document.getElementById("itemTitle")
            .value
            .trim();


        const category =
            document.getElementById("itemCategory")
            .value;


        const location =
            document.getElementById("itemLocation")
            .value;


        const date =
            document.getElementById("itemDate")
            .value;


        const time =
            document.getElementById("itemTime")
            .value;


        const description =
            document.getElementById("itemDescription")
            .value
            .trim();


        const reward =
            Number(
                document.getElementById("reward").value
            );


        const newItem = {

            type: selectedType,

            title,

            category,

            location,

            date,

            time,

            description,

            reward,

            status: "ACTIVE",

            icon: getCategoryIcon(category)

        };


        if (supabaseClient) {

            const selectedCategory = categories.find(item => item.name === category);
            const selectedLocation = locations.find(item => item.name === location);

            if (!selectedCategory || !selectedLocation || !currentUser) {
                alert("Sign in and select a valid category and location before posting.");
                return;
            }

            const { data, error } = await supabaseClient
                .from("items")
                .insert({
                    user_id: currentUser.id,
                    category_id: selectedCategory.id,
                    location_id: selectedLocation.id,
                    type: selectedType,
                    title,
                    description,
                    event_date: date,
                    event_time: time || null,
                    reward_amount: reward,
                    status: "ACTIVE"
                })
                .select("*, categories(name, icon), locations(name)")
                .single();

            if (error) {
                console.error("Supabase insert failed:", error);
                alert("Could not post this item. Check your Supabase table and connection settings.");
                return;
            }

            items.unshift(mapSupabaseItem(data));

        } else {

            newItem.id = Date.now();
            items.unshift(newItem);
            saveItems();

        }

        renderItems();

        this.reset();

        closePostModal();


        alert(
            "✅ Your item has been posted successfully!"
        );

    });


/* =========================================
   VIEW ITEM
========================================= */

function viewItem(id) {

    const item =
        items.find(item => String(item.id) === String(id));

    if (!item) return;


    const content =
        document.getElementById("detailsContent");


    content.innerHTML = `

        <button
            class="close-btn"
            onclick="closeDetails()">

            ×

        </button>


        <div class="item-image"
             style="border-radius:12px; margin-bottom:20px;">

            ${item.icon || getCategoryIcon(item.category)}

        </div>


        <span class="item-status
            ${item.type === "LOST"
                ? "status-lost"
                : "status-found"}">

            ${item.type === "LOST"
                ? "🔴 LOST"
                : "🟢 FOUND"}

        </span>


        <h2 style="margin-top:15px">

            ${escapeHTML(item.title)}

        </h2>


        <p style="color:#777; margin-top:10px">

            ${escapeHTML(item.description)}

        </p>


        <div style="
            margin-top:20px;
            line-height:2;
            color:#555;
        ">

            📍 ${escapeHTML(item.location)}
            <br>

            🏷️ ${escapeHTML(item.category)}
            <br>

            📅 ${item.date}
            <br>

            🕐 ${item.time || "Not specified"}
            <br>

            💰 Reward: ₹${Number(item.reward).toFixed(0)}

        </div>


        ${
            item.type === "FOUND"

            ? `

                <button
                    class="submit-btn"
                    onclick="claimItem('${item.id}')">

                    🤝 This is Mine

                </button>

            `

            : `

                <button
                    class="submit-btn"
                    onclick="closeDetails()">

                    🔍 Search for Match

                </button>

            `
        }

    `;


    document
        .getElementById("detailsModal")
        .classList.add("show");

}


/* =========================================
   CLOSE DETAILS
========================================= */

function closeDetails() {

    document
        .getElementById("detailsModal")
        .classList.remove("show");

}


/* =========================================
   CLAIM ITEM
========================================= */

async function claimItem(id) {

    const item =
        items.find(item => String(item.id) === String(id));

    if (!item) return;


    const confirmed =
        confirm(
            "Are you sure this item belongs to you?"
        );


    if (!confirmed) return;

    if (supabaseClient) {

        if (!currentUser) {
            closeDetails();
            openProfile();
            return;
        }

        if (item.user_id === currentUser.id) {
            alert("You cannot claim an item you posted.");
            return;
        }

        const { error } = await supabaseClient
            .from("claims")
            .insert({
                item_id: item.id,
                claimant_id: currentUser.id,
                message: "Claim submitted through FindBack."
            });

        if (error) {
            console.error("Supabase claim failed:", error);
            alert("Could not submit your claim. Please try again.");
            return;
        }

        alert("✅ Claim submitted! The owner can review your claim.");
        closeDetails();
        return;
    }

    alert(
        "✅ Claim submitted!\n\nThe owner can now verify your claim."
    );


    closeDetails();

}


/* =========================================
   PROFILE
========================================= */

function openProfile() {

    const posted = items.length;

    const found =
        items.filter(
            item => item.type === "FOUND"
        ).length;


    const returned =
        items.filter(
            item => item.status === "RETURNED"
        ).length;


    const score =
        found * 10 +
        returned * 15;


    document.getElementById(
        "profilePosted"
    ).textContent = posted;


    document.getElementById(
        "profileFound"
    ).textContent = found;


    document.getElementById(
        "profileReturned"
    ).textContent = returned;


    document.getElementById(
        "profileScore"
    ).textContent = score;


    document
        .getElementById("profileModal")
        .classList.add("show");

    updateAuthUI();

}


function closeProfile() {

    document
        .getElementById("profileModal")
        .classList.remove("show");

}


/* =========================================
   SUPABASE AUTHENTICATION
========================================= */

let authMode = "signin";

function setAuthMode(mode) {
    authMode = mode;
    document.getElementById("signInMode").classList.toggle("active-lost", mode === "signin");
    document.getElementById("signUpMode").classList.toggle("active-found", mode === "signup");
    document.getElementById("authSubmit").textContent = mode === "signin" ? "Sign in" : "Create account";
    document.getElementById("authPassword").autocomplete = mode === "signin" ? "current-password" : "new-password";
    document.getElementById("authMessage").textContent = "";
}

function updateAuthUI() {
    const authEnabled = Boolean(supabaseClient);
    const signedIn = Boolean(currentUser);
    const authPanel = document.getElementById("authPanel");
    const profileData = document.getElementById("profileData");

    document.getElementById("profileButton").textContent =
        authEnabled && !signedIn ? "👤 Sign in" : "👤 Profile";
    authPanel.style.display = authEnabled && !signedIn ? "block" : "none";
    profileData.style.display = !authEnabled || signedIn ? "block" : "none";
    document.getElementById("signOutButton").style.display =
        authEnabled && signedIn ? "inline-block" : "none";

    if (!authEnabled || !signedIn) return;

    document.getElementById("profileName").textContent = currentUser.email || "Community Member";
    const ownItems = items.filter(item => item.user_id === currentUser.id);
    const foundCount = ownItems.filter(item => item.type === "FOUND").length;
    const returnedCount = ownItems.filter(item => item.status === "RETURNED").length;
    document.getElementById("profilePosted").textContent = ownItems.length;
    document.getElementById("profileFound").textContent = foundCount;
    document.getElementById("profileReturned").textContent = returnedCount;
    document.getElementById("profileScore").textContent = foundCount * 10 + returnedCount * 15;
}

document.getElementById("authForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");
    const result = authMode === "signin"
        ? await supabaseClient.auth.signInWithPassword({ email, password })
        : await supabaseClient.auth.signUp({ email, password });

    if (result.error) {
        message.textContent = result.error.message;
        return;
    }

    if (authMode === "signup" && !result.data.session) {
        message.textContent = "Check your email to confirm your account, then sign in.";
        return;
    }

    currentUser = result.data.user;
    message.textContent = "Signed in successfully.";
    updateAuthUI();
});

document.getElementById("signOutButton").addEventListener("click", async function() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        alert("Could not sign out. Please try again.");
        return;
    }
    currentUser = null;
    updateAuthUI();
});


/* =========================================
   STATISTICS
========================================= */

function updateStats() {

    const total =
        items.length;


    const lost =
        items.filter(
            item => item.type === "LOST"
        ).length;


    const found =
        items.filter(
            item => item.type === "FOUND"
        ).length;


    const returned =
        items.filter(
            item => item.status === "RETURNED"
        ).length;


    document.getElementById(
        "totalItems"
    ).textContent = total;


    document.getElementById(
        "lostCount"
    ).textContent = lost;


    document.getElementById(
        "foundCount"
    ).textContent = found;


    document.getElementById(
        "returnedCount"
    ).textContent = returned;

}


/* =========================================
   CLOSE MODALS ON BACKGROUND CLICK
========================================= */

window.addEventListener(
    "click",
    function(event) {

        const postModal =
            document.getElementById("postModal");

        const detailsModal =
            document.getElementById("detailsModal");

        const profileModal =
            document.getElementById("profileModal");


        if (event.target === postModal) {

            closePostModal();

        }


        if (event.target === detailsModal) {

            closeDetails();

        }


        if (event.target === profileModal) {

            closeProfile();

        }

    }
);


/* =========================================
   INITIALIZE
========================================= */

async function initializeItems() {

    if (supabaseClient) {

        items = [];

        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) console.error("Supabase session lookup failed:", sessionError);
        currentUser = sessionData?.session?.user || null;

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            currentUser = session?.user || null;
            updateAuthUI();
        });

        const [categoryResult, locationResult, itemResult] = await Promise.all([
            supabaseClient.from("categories").select("id, name, icon").order("name"),
            supabaseClient.from("locations").select("id, name").order("name"),
            supabaseClient
                .from("items")
                .select("*, categories(name, icon), locations(name)")
                .order("created_at", { ascending: false })
        ]);

        const setupError = categoryResult.error || locationResult.error || itemResult.error;

        if (setupError) {
            console.error("Supabase load failed:", setupError);
            alert("Could not load FindBack data. Check your Supabase URL, key, schema, and RLS policies.");
        } else {
            categories = categoryResult.data;
            locations = locationResult.data;
            items = itemResult.data.map(mapSupabaseItem);
            populateSelect("itemCategory", categories, "Select category");
            populateSelect("itemLocation", locations, "Select location");
            populateSelect("categoryFilter", categories, "All Categories");
        }

    }

    renderItems();
    updateStats();
    updateAuthUI();

}

function mapSupabaseItem(row) {
    return {
        ...row,
        category: row.categories?.name || "Other",
        location: row.locations?.name || "Unknown",
        date: row.event_date,
        time: row.event_time,
        reward: row.reward_amount || 0,
        icon: row.categories?.icon || getCategoryIcon(row.categories?.name || "Other")
    };
}

function populateSelect(id, rows, placeholder) {
    const select = document.getElementById(id);
    const value = id === "categoryFilter" ? "ALL" : "";
    select.replaceChildren(new Option(placeholder, value));
    rows.forEach(row => select.add(new Option(row.name, row.name)));
}

initializeItems();