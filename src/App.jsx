import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Contract ABI would normally be imported from a JSON file
// This is a simplified version for demonstration
import CONTRACT_ABI from './abi.json'

const CONTRACT_ADDRESS = "0x99880c20e67e2994437Ecb7D2A4ca4d3Ab8efDf4"; // Replace with your deployed contract address

function LandRegistryApp() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [ contract, setContract] = useState(null);
    const [account, setAccount] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [userLands, setUserLands] = useState([]);
    const [selectedLand, setSelectedLand] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [h3Indexes, setH3Indexes] = useState("");
    const [metadataURI, setMetadataURI] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [transferLandId, setTransferLandId] = useState("");
    const [searchH3Index, setSearchH3Index] = useState("");
    const [searchResult, setSearchResult] = useState(null);

    // Connect to wallet
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                setLoading(true);
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                const signer = provider.getSigner();
                const address = await signer.getAddress();
                const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

                setProvider(provider);
                setSigner(signer);
                setContract(contract);
                setAccount(address);
                setIsConnected(true);

                // Load user lands after connecting
                const lands = await contract.getLandsByOwner(address);
                setUserLands(lands.map(land => land.toNumber()));

                setLoading(false);
            } catch (error) {
                console.error("Connection error:", error);
                setLoading(false);
            }
        } else {
            alert("Please install MetaMask or another Ethereum wallet to use this application.");
        }
    };

    // Register new land
    const handleRegisterLand = async (e) => {
        e.preventDefault();
        if (!contract) return;

        try {
            setLoading(true);
            // Parse H3 indexes from comma-separated string
            // Parse H3 indexes from comma-separated string
            const h3IndexArray = h3Indexes.split(',').map(index => index.trim());
            // Properly format hexadecimal values with 0x prefix if needed
            const parsedIndexes = h3IndexArray.map(index => {
                // If the index is already in hex format but missing 0x prefix, add it
                if (/^[0-9a-fA-F]+$/.test(index) && !index.startsWith('0x')) {
                    return ethers.BigNumber.from('0x' + index);
                }
                // If it's a decimal number or already has 0x prefix
                return ethers.BigNumber.from(index);
            });

            const tx = await contract.registerLand(parsedIndexes, metadataURI);
            await tx.wait();

            // Refresh lands after registration
            const lands = await contract.getLandsByOwner(account);
            setUserLands(lands.map(land => land.toNumber()));

            // Clear form
            setH3Indexes("");
            setMetadataURI("");

            setLoading(false);
            alert("Land registered successfully!");
        } catch (error) {
            console.error("Registration error:", error);
            setLoading(false);
            alert(`Error registering land: ${error.message}`);
        }
    };

    // Transfer land
    const handleTransferLand = async (e) => {
        e.preventDefault();
        if (!contract) return;

        try {
            setLoading(true);
            const tx = await contract.transferLand(transferLandId, transferTo);
            await tx.wait();

            // Refresh lands after transfer
            const lands = await contract.getLandsByOwner(account);
            setUserLands(lands.map(land => land.toNumber()));

            // Clear form
            setTransferLandId("");
            setTransferTo("");

            setLoading(false);
            alert("Land transferred successfully!");
        } catch (error) {
            console.error("Transfer error:", error);
            setLoading(false);
            alert(`Error transferring land: ${error.message}`);
        }
    };

    // Search H3 index
    const handleSearchH3Index = async (e) => {
        e.preventDefault();
        if (!contract) return;

        try {
            setLoading(true);
            const landId = await contract.checkH3IndexOwnership(searchH3Index);

            if (landId.toNumber() === 0) {
                setSearchResult({ exists: false });
            } else {
                const landData = await contract.getLandById(landId);
                setSearchResult({
                    exists: true,
                    landId: landId.toNumber(),
                    owner: landData.owner,
                    registrationDate: new Date(landData.registrationDate.toNumber() * 1000).toLocaleDateString(),
                    metadataURI: landData.metadataURI
                });
            }

            setLoading(false);
        } catch (error) {
            console.error("Search error:", error);
            setLoading(false);
            alert(`Error searching H3 index: ${error.message}`);
        }
    };

    // Load land details
    const loadLandDetails = async (landId) => {
        if (!contract) return;

        try {
            setLoading(true);
            const landData = await contract.getLandById(landId);

            setSelectedLand({
                id: landId,
                owner: landData.owner,
                h3Indexes: landData.h3Indexes.map(idx => idx.toString()),
                metadataURI: landData.metadataURI,
                registrationDate: new Date(landData.registrationDate.toNumber() * 1000).toLocaleDateString()
            });

            setLoading(false);
        } catch (error) {
            console.error("Error loading land details:", error);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-blue-800 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Land Registry dApp</h1>
                    {!isConnected ? (
                        <button
                            onClick={connectWallet}
                            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow transition"
                            disabled={loading}
                        >
                            {loading ? "Connecting..." : "Connect Wallet"}
                        </button>
                    ) : (
                        <div className="flex items-center">
                            <div className="mr-4 text-sm bg-blue-900 px-3 py-1 rounded-full">
                                {account.substring(0, 6)}...{account.substring(account.length - 4)}
                            </div>
                            <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="container mx-auto p-4">
                {!isConnected ? (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-semibold mb-4">Welcome to the Land Registry</h2>
                        <p className="mb-6">Connect your wallet to manage and register land parcels on the blockchain.</p>
                        <button
                            onClick={connectWallet}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition"
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column - Register Land Form */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4">Register New Land</h2>
                            <form onSubmit={handleRegisterLand}>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        H3 Indexes (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={h3Indexes}
                                        onChange={(e) => setH3Indexes(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 623847203821, 623847203822"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        Metadata URI
                                    </label>
                                    <input
                                        type="text"
                                        value={metadataURI}
                                        onChange={(e) => setMetadataURI(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="ipfs://..."
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition"
                                    disabled={loading}
                                >
                                    {loading ? "Registering..." : "Register Land"}
                                </button>
                            </form>

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4">Transfer Land</h2>
                                <form onSubmit={handleTransferLand}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Land ID
                                        </label>
                                        <input
                                            type="number"
                                            value={transferLandId}
                                            onChange={(e) => setTransferLandId(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            New Owner Address
                                        </label>
                                        <input
                                            type="text"
                                            value={transferTo}
                                            onChange={(e) => setTransferTo(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="0x..."
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
                                        disabled={loading}
                                    >
                                        {loading ? "Transferring..." : "Transfer Land"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Middle Column - Your Lands */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4">Your Lands</h2>
                            {userLands.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {userLands.map((landId) => (
                                        <li key={landId} className="py-3">
                                            <button
                                                onClick={() => loadLandDetails(landId)}
                                                className="w-full text-left p-2 hover:bg-gray-100 rounded transition"
                                            >
                                                <span className="font-medium">Land ID: {landId}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">You don't own any land parcels yet.</p>
                            )}

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4">Search H3 Index</h2>
                                <form onSubmit={handleSearchH3Index}>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={searchH3Index}
                                            onChange={(e) => setSearchH3Index(e.target.value)}
                                            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter H3 index"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md transition"
                                            disabled={loading}
                                        >
                                            {loading ? "Searching..." : "Search"}
                                        </button>
                                    </div>
                                </form>

                                {searchResult && (
                                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                                        {searchResult.exists ? (
                                            <>
                                                <h3 className="font-medium">Land ID: {searchResult.landId}</h3>
                                                <p className="text-sm mt-2">
                                                    <span className="text-gray-600">Owner:</span> {searchResult.owner}
                                                </p>
                                                <p className="text-sm mt-1">
                                                    <span className="text-gray-600">Registered:</span> {searchResult.registrationDate}
                                                </p>
                                                <p className="text-sm mt-1">
                                                    <span className="text-gray-600">Metadata:</span> {searchResult.metadataURI}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-gray-500 italic">This H3 index is not registered.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Land Details */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4">Land Details</h2>
                            {selectedLand ? (
                                <div>
                                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                                        <h3 className="font-medium text-lg">Land ID: {selectedLand.id}</h3>
                                        <p className="text-sm mt-3">
                                            <span className="text-gray-600 font-medium">Owner:</span><br />
                                            <span className="break-all">{selectedLand.owner}</span>
                                        </p>
                                        <p className="text-sm mt-3">
                                            <span className="text-gray-600 font-medium">Registration Date:</span><br />
                                            {selectedLand.registrationDate}
                                        </p>
                                        <p className="text-sm mt-3">
                                            <span className="text-gray-600 font-medium">Metadata URI:</span><br />
                                            <span className="break-all">{selectedLand.metadataURI}</span>
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <h3 className="font-medium mb-2">H3 Indexes:</h3>
                                        <div className="max-h-64 overflow-y-auto">
                                            <ul className="text-sm space-y-1">
                                                {selectedLand.h3Indexes.map((index, i) => (
                                                    <li key={i} className="bg-gray-100 p-2 rounded break-all">
                                                        {index}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {selectedLand.owner.toLowerCase() === account.toLowerCase() && (
                                        <div className="mt-6">
                                            <button
                                                onClick={() => {
                                                    setTransferLandId(selectedLand.id);
                                                    window.scrollTo({
                                                        top: document.querySelector('form').offsetTop,
                                                        behavior: 'smooth'
                                                    });
                                                }}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
                                            >
                                                Transfer This Land
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">Select a land parcel to view details.</p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <footer className="bg-gray-800 text-white p-4 mt-12">
                <div className="container mx-auto text-center text-sm">
                    <p>Land Registry dApp &copy; {new Date().getFullYear()}</p>
                    <p className="mt-1 text-gray-400">Powered by Ethereum and H3 Geospatial Indexing</p>
                </div>
            </footer>
        </div>
    );
}

export default LandRegistryApp;