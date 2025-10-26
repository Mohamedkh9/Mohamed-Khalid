import React, { useMemo } from 'react';

interface FolioData {
    profileImageUrl?: string;
    name?: string;
    title?: string;
    links?: { title: string; url: string }[];
}

interface FolioPageProps {
    encodedData: string;
}

// Helper to safely decode Base64 strings that may contain UTF-8 characters
const base64ToUtf8 = (str: string): string => {
    try {
        // This combination handles Unicode characters correctly.
        return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
        console.error("Base64 to UTF-8 decoding failed:", e);
        // Return a string that will fail JSON.parse, triggering the error UI
        return "{}";
    }
};

const FolioPage: React.FC<FolioPageProps> = ({ encodedData }) => {
    const data: FolioData | null = useMemo(() => {
        if (!encodedData) return null;
        try {
            const decodedString = base64ToUtf8(encodedData);
            const parsedData = JSON.parse(decodedString);
            // Basic validation to ensure the object has at least one key we expect
            if (Object.keys(parsedData).length === 0 && encodedData.length > 0) {
                 throw new Error("Parsed data is empty but encoded data exists.");
            }
            return parsedData;
        } catch (error) {
            console.error("Failed to parse folio data:", error);
            return null;
        }
    }, [encodedData]);

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="min-h-screen font-sans bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 text-center">
                <div>
                    <i className="fa-solid fa-link-slash text-5xl text-red-500 mb-4"></i>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Invalid Link Folio</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">The link you followed is corrupted or invalid. Please check the QR code and try again.</p>
                </div>
            </div>
        );
    }

    const { profileImageUrl, name, title, links } = data;

    return (
        <div className="min-h-screen font-sans">
             <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#c7d7fe,transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,#3c3678,transparent)]"></div>
            </div>
            <main className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-md p-8 text-center animate-fade-in">
                    {profileImageUrl && (
                        <img
                            src={profileImageUrl}
                            alt={name || 'Profile'}
                            className="w-32 h-32 rounded-full mx-auto -mt-24 mb-4 border-4 border-white dark:border-slate-800 shadow-lg object-cover"
                        />
                    )}
                    {name && <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{name}</h1>}
                    {title && <p className="text-md text-slate-600 dark:text-slate-300 mt-1">{title}</p>}

                    {links && links.length > 0 && (
                        <div className="mt-8 flex flex-col gap-4">
                            {links.filter(link => link && link.url).map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full px-5 py-3 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all duration-200 bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500"
                                >
                                    {link.title || link.url}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                <footer className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 mt-4">
                    <p>Powered by <a href={window.location.origin} className="font-bold hover:underline">QR Master Pro</a></p>
                </footer>
            </main>
        </div>
    );
};

export default FolioPage;