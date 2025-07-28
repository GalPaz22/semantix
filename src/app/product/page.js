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
      case "glasses":
        return <GlassesSearch />;
      case "jewelry":
        return <JewelrySearch />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-gray-800 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center">
          <h1 className="text-3xl font-bold mb-8 text-center">חיפוש בינה מלאכותית</h1>
          <img src="ai.png" alt="ai" className="w-9 h-9 mr-2" />
        </div>

        <p className="text-gray-600 mb-8 text-center">
          להלן הדגמה (מוגבלת) של המוצר בשני תרחישים - חיפוש סמנטי לפי תיאור וחיפוש לפי תוכן תמונה. התוצאות הרלוונטיות ביותר יסודרו משמאל לימין, כאשר התוצאה הרלוונטית ביותר תופיע בפינה הימנית העליונה.
        </p>

        <div className="bg-purple-600 bg-opacity-20 rounded-xl p-6 backdrop-filter backdrop-blur-lg">
          <div className="flex justify-center mb-8 bg-gray-100 p-2 shadow-inner">
            {["products", "jewelry", "glasses"].map((tab) => (
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
                {tab === "glasses" && "משקפי שמש"}
              </button>
            ))}
          </div>

          {renderSearchBar()}
        </div>
      </div>
    </div>
  );
}

// A simple spinner component using TailwindCSS and SVG
function Spinner() {
  return (
    <div className="flex justify-center items-center mt-4">
      <svg
        className="animate-spin h-8 w-8 text-purple-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>
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
    noWord: [
      "wine",
      "white",
      "red",
      "rose",
      "rosé",
      "up",
      "to",
      "from",
      "kosher",
      "between",
      "more",
      "less",
      "for",
      "shekels",
      "on",
      "sale",
    ],
    noHebrewWord: ["אדום", "לבן", "יין", "מבעבע", "רוזה", "מעל", "עד", "מתחת", "יותר"],
    categories: "Red wine, White wine, Rosé wine, Sparkling wine",
  };

  // Fetch products when the component mounts
  useEffect(() => {
    const fetchInitialProducts = async () => {
      setLoading(true);
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
          headers: { "Content-Type": "application/json" },
        });

        const products = await response.json();
        setProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("נכשל לטעון מוצרים");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialProducts();
  }, []);

  // Function to fetch products based on user query
  const fetchProducts = async () => {
    setProducts([]);
    setLoading(true);

    try {
      const response = await fetch("https://shopifyserver-1.onrender.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const data = await response.json();
      setProducts(data);
      setError(data.results?.length === 0 ? "לא נמצאו מוצרים" : "");
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("נכשל לטעון מוצרים");
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
        מבוסס על הקטלוג של{" "}
        <a
          href="https://www.manovino.co.il"
          className="text-blue-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mano Vino
        </a>
      </h1>

      <div className="flex">
        <input
          type="text"
          placeholder='"יין אדום לארוחת ערב איטלקית מתחת ל-400 שקל"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="animated-placeholder w-full p-3 border border-purple-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white bg-opacity-20 text-black"
        />
        <button
          onClick={handleSearch}
          className="p-3 mr-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
        >
          Search
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p className="mt-4 text-center text-red-300">{error}</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* If no products are loaded yet and there's no error, you can show a spinner */}
        {!loading && products.length === 0 && !error && <Spinner />}
        {products.map((product) => (
          <div
            key={product.id}
            className={`bg-white p-6 rounded-lg shadow-lg transition-transform duration-200 hover:scale-105 ${
              product.highlight ? "border-2 border-purple-300" : ""
            }`}
          >
            {product.highlight && (
              <div dir="ltr" className="flex items-center mb-3">
                <span className="font-bold text-black-500">Perfect Match!</span>
                <img
                  src='AI-icon.png'
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
            {product.description && (
              <div className="text-black-200 mb-3 space-y-2">
                {product.description.split(/(?=Product Description:|Product Character:|Food Pairing:|\n| - )/g).map((part, idx) => {
                  // Bold section headers
                  if (/^Product Description:/.test(part)) {
                    return <p key={idx}><span className="font-bold">Product Description:</span>{part.replace(/^Product Description:/, "")}</p>;
                  }
                  if (/^Product Character:/.test(part)) {
                    return <p key={idx}><span className="font-bold">Product Character:</span>{part.replace(/^Product Character:/, "")}</p>;
                  }
                  if (/^Food Pairing:/.test(part)) {
                    return <p key={idx}><span className="font-bold">Food Pairing:</span>{part.replace(/^Food Pairing:/, "")}</p>;
                  }
                  // List items
                  if (/^ - /.test(part)) {
                    return <li key={idx} className="ml-4 list-disc">{part.replace(/^ - /, "")}</li>;
                  }
                  // Otherwise, just a paragraph
                  return <p key={idx}>{part.trim()}</p>;
                })}
              </div>
            )}
            <p className="text-black-300 font-bold mb-4">{product.price}</p>
            <a
              href={product.url}
              className="text-purple-400 hover:text-purple-100 transition-colors duration-200"
            >
              More Details
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
    context: "jewelry",
    collectionName: "theyDream",
    siteId: "jewelry",
    query: query,
    noHebrewWord: ["שרשרת", "טבעת", "צמיד", "עגילים", "עגיל", "תכשיטים", "צ'ארמס"],
    noWord: [
      "ring",
      "silver",
      "gold",
      "bracelet",
      "earring",
      "earrings",
      "necklace",
      "for",
      "jewelry",
    ],
    categories: "טבעות, צמידים, עגילים, שרשראות",
    useImages: true,
  };

  // Fetch products when the component mounts
  useEffect(() => {
    const fetchInitialProducts = async () => {
      setLoading(true);
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
          headers: { "Content-Type": "application/json" },
        });

        const products = await response.json();
        setProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialProducts();
  }, []);

  // Function to fetch products based on user query
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://shopifyserver-1.onrender.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

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
        Based on the catalog of{" "}
        <a
          href="https://theydream-online.com"
          className="text-blue-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          TheyDream
        </a>
      </h1>

      <div className="flex">
        <input
          type="text"
          placeholder='"תכשיטים עם עיצוב של שמש או ירח"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="animated-placeholder w-full p-3 border border-purple-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white bg-opacity-20 text-black"
        />
        <button
          onClick={handleSearch}
          className="p-3 mr-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
        >
          Search
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p className="mt-4 text-center text-red-300">{error}</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && products.length === 0 && !error && <Spinner />}
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
              More Details
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlassesSearch() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestBody = {
    mongodbUri:
      "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    dbName: "shopify",
    context: "sunglasses- translate the hebrew word מנומר to tortoise",
    collectionName: "products2",
    query: query,
    useImages: true,
  };

  // Fetch products when the component mounts
  useEffect(() => {
    const fetchInitialProducts = async () => {
      setLoading(true);
      try {
        const mongodbUri = encodeURIComponent(
          "mongodb+srv://galpaz2210:22Galpaz22@cluster0.qiplrsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        );
        const dbName = encodeURIComponent("shopify");
        const collectionName = encodeURIComponent("products2");
        const limit = 10;

        const url = `https://shopifyserver-1.onrender.com/products?mongodbUri=${mongodbUri}&dbName=${dbName}&collectionName=${collectionName}&limit=${limit}`;

        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const products = await response.json();
        setProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialProducts();
  }, []);

  // Function to fetch products based on user query
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://shopifyserver-1.onrender.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

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
      <div className="flex">
        <input
          type="text"
          placeholder='"משקפי שמש עגולים עם מסגרת מתכת שחורה"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          className="animated-placeholder w-full p-3 border border-purple-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white bg-opacity-20 text-black"
        />
        <button
          onClick={handleSearch}
          className="p-3 mr-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
        >
          Search
        </button>
      </div>

      {loading && <Spinner />}
      {error && <p className="mt-4 text-center text-red-300">{error}</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && products.length === 0 && !error && <Spinner />}
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
          </div>
        ))}
      </div>
    </div>
  );
}
