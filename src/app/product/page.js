"use client";
import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import { noSSR } from "next/dynamic";

export default function SearchDemo() {
  const [activeTab, setActiveTab] = useState("products");

  const renderSearchBar = () => {
    switch (activeTab) {
      case "products":
        return <ProductSearch />;
      case "services":
        return <ServiceSearch />;
      case "jewelry":
        return <JewelrySearch />
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center">
        <h1 className="text-3xl font-bold mb-8 text-center">חיפוש AI </h1>
        <img src="ai.png" alt="ai" className="w-9 h-9 mr-2"></img>
        </div>

       
        <p className="text-gray-600 mb-8 text-center"> לפניכם דמו (מצומצם) של המוצר בשני מתארים- חיפוש סמנטי לפי תיאור וחיפוש לפי תוכן תמונה. התוצאות הרלוונטיות ביותר יסודרו מימין לשמאל, כשהתוצאה הרלוונטית ביותר תופיע מימין למעלה. </p>
   
        <div className="bg-gray-400 bg-opacity-20 rounded-xl p-6 backdrop-filter backdrop-blur-lg">
          <div className="flex justify-center mb-8 bg-gray-100 p-2  shadow-inner">
            {["products",  "jewelry"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
        px-6 py-2 rounded-full text-sm font-medium
        ${
          activeTab === tab
            ? "bg-white text-purple-700 shadow-md"
            : "text-gray-600 hover:bg-gray-200"
        }
        transition-all duration-300 mx-1
      `}
              >
                {tab === "products" && "יין"}
                {tab === "jewelry" && "תכשיטים"}
          
              </button>
            ))}
          </div>

          {renderSearchBar()}
        </div>
      </div>
    </div>
  );
}

function ProductSearch() {
    const [query, setQuery] = useState("");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
  
    const requestBody = {
      mongodbUri:
        "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      dbName: "manoVino",
      collectionName: "products",
      query: query,
      noWord: ["wine", "white","red", "rose", "rosé", "up", "to", "from","kosher", "between", "more", "less", "for","shekels","on","sale"],
      noHebrewWord: ["אדום","לבן","יין","מבעבע","רוזה","מעל","עד","מתחת","יותר"],
      categories: "יין לבן, יין אדום, יין מבעבע, יין רוזה"
    };
  
    // Fetch products when the component mounts
    useEffect(() => {
      const fetchInitialProducts = async () => {
        try {
          const mongodbUri = encodeURIComponent(
            "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
          );
          const dbName = encodeURIComponent("manoVino");
          const collectionName = encodeURIComponent("products");
          const limit = 10;
  
          const url = `https://shopifyserver-1.onrender.com/products?mongodbUri=${mongodbUri}&dbName=${dbName}&collectionName=${collectionName}&limit=${limit}`;
  
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
  
          const products = await response.json();
          setProducts(products); // Update the UI with the fetched products
        } catch (error) {
          console.error("Error fetching products:", error);
          setError("Failed to fetch products");
        }
      };
  
      fetchInitialProducts();
    }, []); // Empty dependency array ensures this runs only once on mount
  
    // Function to fetch products based on user query
    const fetchProducts = async () => {
      setProducts([]);
      setLoading(true);
  
      try {
        const response = await fetch(
          "https://shopifyserver-1.onrender.com/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );
  
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
  
        const data = await response.json();
        setProducts(data);
    
        setError(data.results?.length === 0 ? "No products found" : "");
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };
  
    const handleSearch = () => {
      if (query.trim()) {
        fetchProducts();
      }
    };
  

  return (
    <div>
        <h1 className="font-bold mb-8">
  מבוסס על הקטלוג של <a href="https://www.manovino.co.il" className="text-blue-600" target="_blank" rel="noopener noreferrer">Mano Vino</a>
</h1>

      <div className="flex">
       

        <input
          type="text"
          placeholder='"יין אדום לארוחה איטלקית בפחות מ100 שקלים"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="animated-placeholder w-full p-3 border border-purple-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white bg-opacity-20 text-black"
        />
        <button
          onClick={handleSearch}
          className="p-3 mr-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
        >
          חפש
        </button>
      </div>

      {loading && <p className="mt-4 text-center">טוען...</p>}
      {error && <p className="mt-4 text-center text-red-300">{error}</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.length === 0 && !loading && !error && (
          <p className="text-black font-semibold text-center col-span-full">
            טוען...
          </p>
        )}
   {products.map((product) => (
  <div
    key={product.id}
    // If you want a special border or style when highlight = true, you can conditionally apply a Tailwind class here:
    className={`bg-white p-6 rounded-lg shadow-lg transition-transform duration-200 hover:scale-105 ${
      product.highlight ? "border-2 border-purple-300" : ""
    }`}
  >
    {/* Perfect Match Badge */}
    {product.highlight && (
      <div  dir="ltr" className="flex items-center mb-3">
        <span className="font-bold text-black-500 ">Perfect Match!</span>
        <img
          src="https://alcohome.co.il/wp-content/uploads/2024/09/ai_stars_icon-removebg-preview.png"
          alt="Sparkling Star"
          width="30"
          height="30"
          className="inline-block mr-2"
        />
      </div>
    )}

    <div className="w-65 h-72 mb-4 flex justify-center items-center">
      <img
        width={120}
        height={100}
        src={product.image}
        alt={product.title}
        className="rounded-md object-cover h-full"
      />
    </div>

    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
    <p className="text-black-200 mb-3">{product.description}</p>
    <p className="text-black-300 font-bold mb-4">₪{product.price}</p>
    <a
      href={product.url}
      className="text-purple-400 hover:text-purple-100 transition-colors duration-200"
    >
      לפרטים נוספים
    </a>
  </div>
))}
      </div>
    </div>
  );
}

function JewelrySearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestBody = {
    mongodbUri:
      "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    dbName: "wineDB",
    context :"jewelry",
    collectionName: "theyDream",
    siteId: "jewelry",
    query: query,
    noHebrewWord:["שרשרת", "טבעת","צמיד","עגילים","עגיל","תכשיטים","צ'ארמס"],
    noWord: ["ring","silver","gold","bracelet","earring","earrings", "necklace", "for","jewelry"],
    categories: "טבעות, צמידים, עגילים, שרשראות"
  };

  // Fetch products when the component mounts
  useEffect(() => {
    const fetchInitialProducts = async () => {
      try {
        const mongodbUri = encodeURIComponent(
          "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        );
        const dbName = encodeURIComponent("wineDB");
        const collectionName = encodeURIComponent("theyDream");
        const limit = 10;

        const url = `https://shopifyserver-1.onrender.com/products?mongodbUri=${mongodbUri}&dbName=${dbName}&collectionName=${collectionName}&limit=${limit}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const products = await response.json();
        setProducts(products); // Update the UI with the fetched products
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products");
      }
    };

    fetchInitialProducts();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Function to fetch products based on user query
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "https://shopifyserver-1.onrender.com/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data = await response.json();
      setProducts(data);
      
      setError(data.results?.length === 0 ? "No products found" : "");
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      fetchProducts();
    }
  };


return (
  <div>
          <h1 className="font-bold mb-8">
  מבוסס על הקטלוג של <a href="https://theydream-online.com" className="text-blue-600" target="_blank" rel="noopener noreferrer">TheyDream</a>
</h1>

   
    <div className="flex">
      

      <input
        type="text"
        placeholder='"כל התכשיטים שיש בהם שמש או ירח" '
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="animated-placeholder w-full p-3 border border-purple-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white bg-opacity-20 text-black"
      />
      <button
        onClick={handleSearch}
        className="p-3 mr-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
      >
        חפש
      </button>
    </div>

    {loading && <p className="mt-4 text-center">טוען...</p>}
    {error && <p className="mt-4 text-center text-red-300">{error}</p>}

    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.length === 0 && !loading && !error && (
        <p className="text-black font-semibold text-center col-span-full">
          טוען...
        </p>
      )}
      {products.map((product) => (
      
        <div
          key={product.id}
          className="bg-white p-6 rounded-lg shadow-lg transition-transform duration-200 hover:scale-105"
        >
          <div className="w-75 h-65 mb-4 flex justify-center items-center">
            <img
              width={200}
              height={100}
              src={product.image}
              alt={product.name}
              className="rounded-md object-cover h-full"
            />
          </div>

          <p className="text-xl font-semibold mb-2 text-black">{product.name}</p>
    
         
          <a
            href={product.url}
            className="text-purple-300 hover:text-purple-100 transition-colors duration-200"
          >
            לפרטים נוספים
          </a>
        </div>
      ))}
    </div>
  </div>
);
}
