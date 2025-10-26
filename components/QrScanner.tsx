import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { Card } from './common/Card';
import { Button } from './common/Button';
// FIX: Import the Loader component.
import { Loader } from './common/Loader';

// AI Repair function placeholder - in a real app this would call Gemini service
const repairQrCodeWithAI = async (imageDataUrl: string): Promise<string> => {
    // This is a mock function. A real implementation would call the Gemini service.
    console.warn("AI Repair is a placeholder. No actual API call is made.");
    // It just returns the same image after a delay to simulate processing.
    return new Promise(resolve => setTimeout(() => resolve(imageDataUrl), 1500));
};

const QrScanner: React.FC = () => {
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isAiRepairing, setIsAiRepairing] = useState(false);
    const [failedUpload, setFailedUpload] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // FIX: Initialize useRef with null to provide an initial value.
    const animationFrameId = useRef<number | null>(null);

    const startScan = useCallback(async () => {
        setScannedData(null);
        setError(null);
        setFailedUpload(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
                await videoRef.current.play();
                setIsScanning(true);
            }
        } catch (err) {
            setError('Could not access camera. Please grant permission and try again.');
            console.error(err);
        }
    }, []);

    const stopScan = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    }, []);
    
    // FIX: Refactor scanning logic into a useEffect hook to fix stale closures and lifecycle issues.
    useEffect(() => {
        if (!isScanning) {
            return;
        }

        const tick = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                if (ctx) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        setScannedData(code.data);
                        stopScan();
                        return; // Exit loop on success
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(tick);
        };
        
        animationFrameId.current = requestAnimationFrame(tick);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isScanning, stopScan]);

    useEffect(() => {
        return () => stopScan();
    }, [stopScan]);

    const scanImage = (imageDataUrl: string): Promise<{ data: string | null }> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        resolve({ data: code?.data || null });
                    } else {
                        resolve({ data: null });
                    }
                } else {
                    resolve({ data: null });
                }
            };
            img.onerror = () => resolve({ data: null });
            img.src = imageDataUrl;
        });
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageDataUrl = e.target?.result as string;
                if (!imageDataUrl) return;

                const { data } = await scanImage(imageDataUrl);
                if (data) {
                    setScannedData(data);
                    setError(null);
                    setFailedUpload(null);
                } else {
                    setScannedData(null);
                    setError("No QR code found. You can try AI Repair on the uploaded image.");
                    setFailedUpload(imageDataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const attemptAiRepair = async () => {
        if (!failedUpload) {
            setError("Please upload a damaged QR code image before attempting repair.");
            return;
        }

        setIsAiRepairing(true);
        setError(null);
        setScannedData(null);

        try {
            const repairedImage = await repairQrCodeWithAI(failedUpload);
            const { data } = await scanImage(repairedImage);

            if (data) {
                setScannedData(data);
                setFailedUpload(null);
            } else {
                setError("AI Repair could not recover the QR code. This is a demo feature.");
            }
        } catch (err) {
            setError("An error occurred during AI Repair.");
        } finally {
            setIsAiRepairing(false);
        }
    };

    const isUrl = (text: string) => {
        try {
            new URL(text);
            return text.startsWith('http://') || text.startsWith('https://');
        } catch (_) {
            return false;
        }
    }

    return (
        <Card title="Scan QR Code" icon="fa-camera-retro">
            <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-md aspect-square bg-slate-900/80 rounded-2xl overflow-hidden relative shadow-inner">
                    <video ref={videoRef} className={`w-full h-full object-cover transition-opacity duration-300 ${!isScanning && 'opacity-0'}`}></video>
                    {!isScanning && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
                             <i className="fa-solid fa-qrcode text-6xl mb-4"></i>
                            <p className="font-semibold">Camera is off</p>
                            <p className="text-sm text-slate-500 text-center">Start the camera or upload an image to begin scanning.</p>
                        </div>
                    )}
                    {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3/4 h-3/4 relative">
                                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-lg animate-pulse"></div>
                                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-lg animate-pulse"></div>
                                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-lg animate-pulse"></div>
                                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-lg animate-pulse"></div>
                            </div>
                        </div>
                    )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={isScanning ? stopScan : startScan} variant={isScanning ? 'danger' : 'primary'}>
                        <i className={`fa-solid ${isScanning ? 'fa-stop' : 'fa-video'} mr-2`}></i>
                        {isScanning ? 'Stop Camera' : 'Start Camera'}
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                         <i className="fa-solid fa-upload mr-2"></i>Upload Image
                    </Button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
                
                <div className="w-full text-center mt-2 space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                
                    {scannedData && (
                        <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg w-full animate-fade-in">
                            <h3 className="font-bold text-lg text-brand-600 dark:text-brand-400 flex items-center justify-center gap-2">
                              <i className="fa-solid fa-check-circle"></i>
                              Scan Successful!
                            </h3>
                            <p className="mt-2 p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded break-words font-mono text-sm shadow-inner">{scannedData}</p>
                            {isUrl(scannedData) && (
                                <a href={scannedData} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950">
                                    Open Link <i className="fa-solid fa-arrow-up-right-from-square ml-2 text-xs"></i>
                                </a>
                            )}
                        </div>
                    )}

                    <Button onClick={attemptAiRepair} disabled={isAiRepairing || !failedUpload} variant='tertiary' size="sm">
                        {isAiRepairing ? <><Loader/> Repairing...</> : <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Attempt AI Repair</>}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default QrScanner;