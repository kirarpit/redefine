import { useState } from "react";

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    // <div className="mb-4">
    //   <input
    //     type="text"
    //     placeholder="Search..."
    //     value={searchTerm}
    //     onChange={(e) => setSearchTerm(e.target.value)}
    //     className="border border-gray-300 rounded-md p-2 w-full"
    //   />
    // </div>
    <div className="flex h-screen flex-col items-center bg-gray-50 pt-56">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white p-5 shadow-sm">
        <div className="flex overflow-hidden rounded-md bg-gray-200 focus:outline focus:outline-blue-500">
          <input
            type="text"
            placeholder="Seach Tag"
            className="w-full rounded-bl-md rounded-tl-md bg-gray-100 px-4 py-2.5 text-gray-700 focus:outline-blue-500"
          />
          <button className="bg-blue-500 px-3.5 text-white duration-150 hover:bg-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 flex gap-x-10 text-gray-400">
          <p>#Team</p>
          <p>#Politics</p>
          <p>#Gaming</p>
        </div>
      </div>
    </div>
  );
}

export default function MyApp() {
  return (
    <SearchBar />
    // <div className="p-4">
    //   <h1 className="text-2xl font-bold mb-4">Welcome to my app!</h1>
    //   <button className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600">
    //     Click Me
    //   </button>
    // </div>
  );
}
