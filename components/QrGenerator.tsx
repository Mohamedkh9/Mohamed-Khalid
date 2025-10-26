import React, { useState, useCallback, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import QRCodeStyling from 'qr-code-styling';
import { generateArtQrCode } from '../services/geminiService';
import { QrCodeType, QR_CODE_TYPES, QrField, ART_PROMPTS } from '../constants';
import { Card } from './common/Card';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Button } from './common/Button';
import { Loader } from './common/Loader';

const formatDateTimeForICS = (dateTime: string) => {
    if (!dateTime) return '';
    return dateTime.replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Helper to safely encode UTF-8 strings (including emojis) to Base64.
const utf8ToBase64 = (str: string): string => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.error("UTF-8 to Base64 encoding failed:", e);
        throw new Error("Could not encode data for QR code. Please check for unsupported characters.");
    }
};


const QrGenerator: React.FC = () => {
    const [qrType, setQrType] = useState<QrCodeType>(QrCodeType.URL);
    const [qrData, setQrData] = useState<Record<string, any>>({ url: 'https://ai.google.dev' });
    const [qrValue, setQrValue] = useState<string>('https://ai.google.dev');
    const [qrStyleOptions, setQrStyleOptions] = useState({
        dotsOptions: {
            type: 'rounded',
            gradient: {
                type: 'linear' as const,
                rotation: 0,
                colorStops: [
                    { offset: 0, color: '#3b82f6' }, // primary-500
                    { offset: 1, color: '#1d4ed8' }, // primary-700
                ]
            }
        },
        backgroundOptions: { color: '#ffffff' },
        image: '',
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 5,
        },
        cornersSquareOptions: { type: 'extra-rounded', color: '#4c51bf' },
        cornersDotOptions: { type: 'dot', color: '#43419b' },
    });
    const [artPrompt, setArtPrompt] = useState<string>('A vibrant coral reef with colorful fish');
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiQrImage, setAiQrImage] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [standardQrValidationStatus, setStandardQrValidationStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{ percentage: number; message: string } | null>(null);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    const qrContainerRef = useRef<HTMLDivElement>(null);
    const qrCodeStyling = useRef<QRCodeStyling | null>(null);
    const validationCanvasRef = useRef<HTMLCanvasElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    // Initialize QRCodeStyling instance
    useEffect(() => {
        if (qrContainerRef.current && !qrCodeStyling.current) {
            qrCodeStyling.current = new QRCodeStyling({
                width: 160,
                height: 160,
                type: 'canvas',
                data: qrValue,
                ...qrStyleOptions,
                qrOptions: {
                    errorCorrectionLevel: 'H'
                }
            });
            qrCodeStyling.current.append(qrContainerRef.current);
        }
    }, []);

    // Update QR code when value or style changes
    useEffect(() => {
        if (qrCodeStyling.current) {
            qrCodeStyling.current.update({
                data: qrValue,
                ...qrStyleOptions
            });
        }
    }, [qrValue, qrStyleOptions]);
    
    useEffect(() => {
        try {
            let value = '';
            
            switch (qrType) {
                case QrCodeType.URL:
                    value = qrData.url || '';
                    break;
                case QrCodeType.Text:
                    value = qrData.text || '';
                    break;
                case QrCodeType.WiFi: {
                    const enc = qrData.encryption || 'WPA';
                    let wifiString = `WIFI:S:${qrData.ssid || ''};T:${enc};`;
                    if (enc !== 'nopass' && qrData.password) {
                        wifiString += `P:${qrData.password};`;
                    }
                    wifiString += ';';
                    value = wifiString;
                    break;
                }
                case QrCodeType.Email: {
                    const { email, subject, body } = qrData;
                    value = `mailto:${email || ''}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
                    break;
                }
                case QrCodeType.SMS: {
                    const { phone, message } = qrData;
                    value = `smsto:${phone || ''}:${encodeURIComponent(message || '')}`;
                    break;
                }
                case QrCodeType.Geo: {
                     const { latitude, longitude } = qrData;
                    value = `geo:${latitude || ''},${longitude || ''}`;
                    break;
                }
                case QrCodeType.VCard: {
                    const { firstName, lastName, phone, email, organization, title, website } = qrData;
                    value = `BEGIN:VCARD
VERSION:3.0
N:${lastName || ''};${firstName || ''}
FN:${firstName || ''} ${lastName || ''}
ORG:${organization || ''}
TITLE:${title || ''}
TEL;TYPE=WORK,VOICE:${phone || ''}
EMAIL:${email || ''}
URL:${website || ''}
END:VCARD`;
                    break;
                }
                case QrCodeType.Event: {
                    const { summary, location, dtstart, dtend, description } = qrData;
                    value = `BEGIN:VEVENT
SUMMARY:${summary || ''}
LOCATION:${location || ''}
DTSTART:${formatDateTimeForICS(dtstart)}
DTEND:${formatDateTimeForICS(dtend)}
DESCRIPTION:${description || ''}
END:VEVENT`;
                    break;
                }
                case QrCodeType.WhatsApp: {
                    const { phone, message } = qrData;
                    const cleanPhone = (phone || '').replace(/\D/g, '');
                    let waUrl = `https://wa.me/${cleanPhone}`;
                    if (message) {
                        waUrl += `?text=${encodeURIComponent(message)}`;
                    }
                    value = waUrl;
                    break;
                }
                case QrCodeType.LinkFolio: {
                    const { profileImageUrl, name, title, links } = qrData;
                    const validLinks = (links || []).filter((link: any) => link && link.title && link.url);
                    const folioData = { profileImageUrl, name, title, links: validLinks };
                    const jsonString = JSON.stringify(folioData);
                    const base64String = utf8ToBase64(jsonString); // Use Unicode-safe encoding
                    const baseAppUrl = window.location.href.split('?')[0];
                    value = `${baseAppUrl}?folio=${encodeURIComponent(base64String)}`;
                    break;
                }
            }
            
            // If we reach here, generation was successful, clear any previous error
            if(error) setError(null);

            setQrValue(currentQrValue => {
                if (currentQrValue !== value) {
                    setAiQrImage(null);
                    setValidationStatus('idle');
                }
                return value;
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while generating QR value.";
            console.error("QR Generation Error:", e);
            setError(errorMessage);
            setQrValue(''); // Clear QR on error to prevent displaying a stale/wrong code
        }

    }, [qrData, qrType]);

    // Validation for the standard QR code
    useEffect(() => {
        if (!qrValue || !qrCodeStyling.current) {
            setStandardQrValidationStatus('idle');
            return;
        }

        const validationTimeout = setTimeout(() => {
            const canvas = qrContainerRef.current?.querySelector('canvas');
            if (!canvas) {
                setStandardQrValidationStatus('failed');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setStandardQrValidationStatus('failed');
                return;
            }

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code && code.data === qrValue) {
                    setStandardQrValidationStatus('success');
                } else {
                    setStandardQrValidationStatus('failed');
                }
            } catch (e) {
                console.error("Error validating QR code:", e);
                setStandardQrValidationStatus('failed');
            }
        }, 100);

        return () => clearTimeout(validationTimeout);
    }, [qrValue, qrStyleOptions]);

    const handleInputChange = (field: string, value: string) => {
        setQrData(prev => ({ ...prev, [field]: value }));
    };

    const handleStyleChange = (key: keyof typeof qrStyleOptions, value: any) => {
        setQrStyleOptions(prev => ({...prev, [key]: value}));
    }

     const handleImageOptionChange = (key: keyof typeof qrStyleOptions.imageOptions, value: any) => {
        setQrStyleOptions(prev => ({
            ...prev,
            imageOptions: {
                ...prev.imageOptions,
                [key]: value
            }
        }));
    }
    
    const handleTypeChange = (newType: QrCodeType) => {
        setQrType(newType);
        setShowAdvanced(false);
        
        let defaultData: Record<string, any> = {};
        if (newType === QrCodeType.LinkFolio) {
            defaultData = {
                profileImageUrl: '',
                name: '',
                title: '',
                links: [{ title: 'Website', url: 'https://' }]
            };
        } else {
            const typeInfo = QR_CODE_TYPES.find(t => t.value === newType);
            if (typeInfo) {
                defaultData = Object.fromEntries(
                    typeInfo.fields.map(field => {
                        let value = '';
                        if (field.id === 'url') {
                            value = 'https://ai.google.dev';
                        } else if (field.type === 'select' && field.options) {
                            value = field.options[0].value;
                        }
                        return [field.id, value];
                    })
                );
            }
        }
        setQrData(defaultData);
    };

    const handleGenerateArt = useCallback(async () => {
        if (!qrValue || !artPrompt || !qrCodeStyling.current) {
            setError("Please generate a QR code and enter an art prompt first.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setAiQrImage(null);
        setValidationStatus('idle');

        try {
            const blob = await qrCodeStyling.current.getRawData('png');
            if (!blob) throw new Error("Could not get QR code image data.");
            
            const base64QrImage = await blobToBase64(blob);
            const result = await generateArtQrCode(base64QrImage, artPrompt);
            setAiQrImage(`data:image/png;base64,${result}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [qrValue, artPrompt, qrStyleOptions]);

    const handleValidateAiQr = () => {
        if (!aiQrImage || !validationCanvasRef.current) return;

        const canvas = validationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not get canvas context for validation.");
            return;
        }

        const img = new Image();
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code && code.data === qrValue) {
                setValidationStatus('success');
            } else {
                setValidationStatus('failed');
            }
        };
        img.onerror = () => {
            setError("Failed to load AI image for validation.");
            setValidationStatus('failed');
        }
        img.src = aiQrImage;
    };

    const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
        const newLinks = [...(qrData.links || [])];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setQrData(prev => ({ ...prev, links: newLinks }));
    };

    const addLink = () => {
        const newLinks = [...(qrData.links || []), { title: '', url: '' }];
        setQrData(prev => ({ ...prev, links: newLinks }));
    };

    const removeLink = (index: number) => {
        const newLinks = [...(qrData.links || [])];
        newLinks.splice(index, 1);
        setQrData(prev => ({ ...prev, links: newLinks }));
    };

    const renderInputs = () => {
        const typeInfo = QR_CODE_TYPES.find(t => t.value === qrType);
        if (!typeInfo) return null;

        const renderField = (field: QrField) => {
            if (field.type === 'select') {
                return <Select key={field.id} label={field.label} value={qrData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} options={field.options || []} />;
            }
            if (field.type === 'textarea') {
                 return <textarea key={field.id} placeholder={field.placeholder} value={qrData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} className="w-full px-4 py-2 bg-slate-200/50 dark:bg-slate-800/70 border border-slate-300/70 dark:border-slate-700/80 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/80 focus:border-brand-500 transition duration-200" rows={3}></textarea>
            }
            return <Input key={field.id} label={field.label} placeholder={field.placeholder} value={qrData[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} type={field.type || 'text'}/>;
        };

        if (qrType === QrCodeType.LinkFolio) {
            return (
                <div className="space-y-4">
                    {typeInfo.fields.map(renderField)}
                    <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 pt-4 border-t border-slate-200/80 dark:border-slate-700/80">Links</h4>
                    <div className="space-y-3">
                    {(qrData.links || []).map((link: any, index: number) => (
                        <div key={index} className="flex items-end gap-2 p-3 rounded-lg bg-slate-200/30 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/50 animate-fade-in">
                            <div className="flex-grow grid grid-cols-2 gap-2">
                                <Input label={`Link ${index + 1} Title`} placeholder="Website" value={link.title} onChange={e => handleLinkChange(index, 'title', e.target.value)} />
                                <Input label="URL" placeholder="https://" value={link.url} onChange={e => handleLinkChange(index, 'url', e.target.value)} />
                            </div>
                            <Button variant="danger" size="sm" onClick={() => removeLink(index)} className="h-10 w-10 flex-shrink-0" aria-label="Remove link">
                                <i className="fa-solid fa-trash"></i>
                            </Button>
                        </div>
                    ))}
                    </div>
                    <Button variant="secondary" onClick={addLink} fullWidth>
                        <i className="fa-solid fa-plus mr-2"></i> Add Link
                    </Button>
                </div>
            )
        }

        let visibleFields = typeInfo.fields;
        if (qrType === QrCodeType.WiFi && qrData.encryption === 'nopass') {
            visibleFields = visibleFields.filter(field => field.id !== 'password');
        }
        const primaryFields = visibleFields.filter(field => !field.optional);
        const advancedFields = visibleFields.filter(field => field.optional);

        return (
            <div className="space-y-4">
                {primaryFields.map(renderField)}
                {advancedFields.length > 0 && (
                    <div className="pt-2">
                        <Button variant="tertiary" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} fullWidth>
                            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                            <i className={`fa-solid fa-chevron-down ml-2 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}></i>
                        </Button>
                    </div>
                )}
                {showAdvanced && advancedFields.length > 0 && (
                    <div className="space-y-4 pt-2 animate-fade-in">
                        {advancedFields.map(renderField)}
                    </div>
                )}
            </div>
        );
    };

    const handleDownloadPng = () => qrCodeStyling.current?.download({ name: 'qr-master-pro', extension: 'png' });
    const handleDownloadSvg = () => qrCodeStyling.current?.download({ name: 'qr-master-pro', extension: 'svg' });

    const downloadUrl = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    const handleDownloadAI = () => {
        if (aiQrImage) {
            downloadUrl(aiQrImage, 'qr-master-pro-ai.png');
        }
    };
    
    const handleBatchExport = async () => {
        if (!qrValue || !qrCodeStyling.current) {
            setError("Please generate a QR code first.");
            return;
        }

        setIsExporting(true);
        setError(null);
        setExportProgress({ percentage: 0, message: 'Starting export...' });

        const zip = new JSZip();

        try {
            await new Promise(res => setTimeout(res, 200));
            setExportProgress({ percentage: 10, message: 'Adding standard-qr.png...' });
            const pngBlob = await qrCodeStyling.current.getRawData('png');
            if(pngBlob) zip.file('standard-qr.png', pngBlob);

            await new Promise(res => setTimeout(res, 200));
            setExportProgress({ percentage: 30, message: 'Adding standard-qr.svg...' });
            const svgBlob = await qrCodeStyling.current.getRawData('svg');
            if(svgBlob) zip.file('standard-qr.svg', svgBlob);

            if (aiQrImage) {
                await new Promise(res => setTimeout(res, 200));
                setExportProgress({ percentage: 60, message: 'Adding ai-art-qr.png...' });
                const aiBlob = await (await fetch(aiQrImage)).blob();
                if (aiBlob) zip.file('ai-art-qr.png', aiBlob);
            }

            await new Promise(res => setTimeout(res, 200));
            setExportProgress({ percentage: 90, message: 'Compressing files...' });
            const content = await zip.generateAsync({ type: 'blob' });
            
            await new Promise(res => setTimeout(res, 200));
            setExportProgress({ percentage: 100, message: 'Download starting...' });
            downloadUrl(URL.createObjectURL(content), 'qr-master-pro-export.zip');

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create ZIP file.");
        } finally {
            setTimeout(() => {
                setIsExporting(false);
                setExportProgress(null);
            }, 2000);
        }
    };

    const handleInspireMeClick = () => {
        const randomIndex = Math.floor(Math.random() * ART_PROMPTS.length);
        setArtPrompt(ART_PROMPTS[randomIndex]);
    };

    const processLogoFile = (file: File) => {
        setLogoError(null);

        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setLogoError('Invalid file type. Please upload a PNG, JPG, GIF, or SVG.');
            return;
        }

        const maxSizeInMB = 2;
        if (file.size > maxSizeInMB * 1024 * 1024) {
            setLogoError(`File is too large. Maximum size is ${maxSizeInMB}MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                handleStyleChange('image', reader.result);
            }
        };
        reader.onerror = () => {
            setLogoError('Failed to read the file.');
        };
        reader.readAsDataURL(file);
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processLogoFile(file);
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processLogoFile(file);
        }
    };

    return (
        <>
            <canvas ref={validationCanvasRef} className="hidden"></canvas>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-6">
                    <Card title="1. Choose Content Type" icon="fa-list-check">
                        <Select
                            label="QR Code Type"
                            value={qrType}
                            onChange={e => handleTypeChange(e.target.value as QrCodeType)}
                            options={QR_CODE_TYPES.map(t => ({ label: t.label, value: t.value }))}
                        />
                    </Card>
                    <Card title="2. Enter Your Data" icon="fa-keyboard">
                        {renderInputs()}
                         <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
                            QR code updates live as you type.
                        </p>
                    </Card>
                    <Card title="3. Customize Style" icon="fa-palette">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dots Gradient Start</label>
                                <input 
                                    type="color" 
                                    value={qrStyleOptions.dotsOptions.gradient.colorStops[0].color} 
                                    onChange={e => {
                                        const newColorStops = [...qrStyleOptions.dotsOptions.gradient.colorStops];
                                        newColorStops[0] = { ...newColorStops[0], color: e.target.value };
                                        handleStyleChange('dotsOptions', {
                                            ...qrStyleOptions.dotsOptions,
                                            gradient: { ...qrStyleOptions.dotsOptions.gradient, colorStops: newColorStops }
                                        });
                                    }}
                                    className="w-full h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dots Gradient End</label>
                                <input 
                                    type="color" 
                                    value={qrStyleOptions.dotsOptions.gradient.colorStops[1].color} 
                                    onChange={e => {
                                        const newColorStops = [...qrStyleOptions.dotsOptions.gradient.colorStops];
                                        newColorStops[1] = { ...newColorStops[1], color: e.target.value };
                                        handleStyleChange('dotsOptions', {
                                            ...qrStyleOptions.dotsOptions,
                                            gradient: { ...qrStyleOptions.dotsOptions.gradient, colorStops: newColorStops }
                                        });
                                    }}
                                    className="w-full h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Background Color</label>
                                <input type="color" value={qrStyleOptions.backgroundOptions.color} onChange={e => handleStyleChange('backgroundOptions', {color: e.target.value})} className="w-full h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Corner Square Color</label>
                                <input type="color" value={qrStyleOptions.cornersSquareOptions.color} onChange={e => handleStyleChange('cornersSquareOptions', {...qrStyleOptions.cornersSquareOptions, color: e.target.value})} className="w-full h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Corner Dot Color</label>
                                <input type="color" value={qrStyleOptions.cornersDotOptions.color} onChange={e => handleStyleChange('cornersDotOptions', {...qrStyleOptions.cornersDotOptions, color: e.target.value})} className="w-full h-10 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"/>
                            </div>
                            <Select label="Dot Style" value={qrStyleOptions.dotsOptions.type} onChange={e => handleStyleChange('dotsOptions', {...qrStyleOptions.dotsOptions, type: e.target.value})} options={[{label: 'Square', value: 'square'}, {label: 'Rounded', value: 'rounded'}, {label: 'Dots', value: 'dots'}]} />
                            <Select label="Corner Style" value={qrStyleOptions.cornersSquareOptions.type || 'square'} onChange={e => handleStyleChange('cornersSquareOptions', {...qrStyleOptions.cornersSquareOptions, type: e.target.value})} options={[{label: 'Square', value: 'square'}, {label: 'Extra Rounded', value: 'extra-rounded'}, {label: 'Dot', value: 'dot'}]} />
                            
                            <hr className="sm:col-span-2 my-2 border-slate-200/80 dark:border-slate-700/80" />

                            <div className="sm:col-span-2 space-y-2">
                                <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300">Logo Options</h4>
                                <div
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => !qrStyleOptions.image && logoInputRef.current?.click()}
                                    className={`relative p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
                                        ${isDraggingOver 
                                            ? 'border-brand-500 bg-brand-500/10' 
                                            : 'border-slate-300/80 dark:border-slate-700/80 hover:border-brand-500/50 hover:bg-slate-200/20 dark:hover:bg-slate-800/20'
                                        }
                                        ${qrStyleOptions.image ? 'cursor-default' : ''}
                                    `}
                                >
                                    <input
                                        type="file"
                                        ref={logoInputRef}
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/gif, image/svg+xml"
                                    />
                                    {qrStyleOptions.image ? (
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                <img src={qrStyleOptions.image} alt="Logo Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Logo loaded successfully!</p>
                                                <Button onClick={() => logoInputRef.current?.click()} size="sm" variant="secondary" fullWidth>
                                                    <i className="fa-solid fa-exchange-alt mr-2"></i> Change Logo
                                                </Button>
                                                <Button onClick={() => handleStyleChange('image', '')} size="sm" variant="danger" fullWidth>
                                                    <i className="fa-solid fa-trash mr-2"></i> Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 py-4">
                                            <i className="fa-solid fa-cloud-upload-alt text-4xl mb-3"></i>
                                            <p className="font-semibold">Drag & drop your logo here</p>
                                            <p className="text-sm">or <span className="text-brand-500 font-bold">click to browse</span></p>
                                            <p className="text-xs mt-2">PNG, JPG, GIF, SVG up to 2MB</p>
                                        </div>
                                    )}
                                </div>
                                
                                {logoError && (
                                    <p className="text-sm text-red-500 animate-fade-in">{logoError}</p>
                                )}
                                
                                {qrStyleOptions.image && (
                                    <div className="space-y-4 pt-2 animate-fade-in">
                                        <div>
                                            <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                                <span>Logo Size</span>
                                                <span>{Math.round(qrStyleOptions.imageOptions.imageSize * 100)}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1"
                                                step="0.05"
                                                value={qrStyleOptions.imageOptions.imageSize}
                                                onChange={e => handleImageOptionChange('imageSize', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                                <span>Logo Margin</span>
                                                <span>{qrStyleOptions.imageOptions.margin} px</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="20"
                                                step="1"
                                                value={qrStyleOptions.imageOptions.margin}
                                                onChange={e => handleImageOptionChange('margin', parseInt(e.target.value, 10))}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                    <Card title="4. Make it Art with AI" icon="fa-wand-magic-sparkles">
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Artistic Prompt
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="e.g., A cyberpunk city skyline"
                                        value={artPrompt}
                                        onChange={e => setArtPrompt(e.target.value)}
                                        className="w-full pl-4 pr-12 py-2 bg-slate-200/50 dark:bg-slate-800/70 border border-slate-300/70 dark:border-slate-700/80 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/80 focus:border-brand-500 transition duration-200"
                                    />
                                    <button
                                        onClick={handleInspireMeClick}
                                        className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-slate-500 hover:text-brand-500 transition-colors duration-200"
                                        aria-label="Inspire me with a random prompt"
                                        title="Inspire me"
                                    >
                                        <i className="fa-solid fa-lightbulb"></i>
                                    </button>
                                </div>
                            </div>
                            <Button onClick={handleGenerateArt} disabled={isLoading || !qrValue} fullWidth>
                                {isLoading ? <><Loader /> Generating...</> : <><i className="fa-solid fa-palette mr-2"></i>Generate AI QR Art</>}
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                    {error && <div className="p-4 bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg">{error}</div>}
                    <Card title="Your Generated Codes" icon="fa-images">
                        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                            {/* Standard QR Section */}
                            <div className="flex flex-col items-center justify-center gap-4">
                                <h3 className="text-md font-bold text-slate-700 dark:text-slate-300">Standard QR</h3>
                                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl shadow-inner">
                                    <div className="bg-white p-2 rounded-lg shadow-md border-2 border-brand-500">
                                        {qrValue ? (
                                            <div ref={qrContainerRef} className="w-40 h-40"></div>
                                        ) : (
                                            <div className="w-40 h-40 bg-slate-200 flex flex-col items-center justify-center text-slate-400 rounded-md">
                                                <i className="fa-solid fa-qrcode text-4xl mb-2"></i>
                                                <span className="text-xs text-center">Enter data to start</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {qrValue && standardQrValidationStatus !== 'idle' && (
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-bold rounded-full transition-all duration-300 ${
                                        standardQrValidationStatus === 'success' 
                                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' 
                                        : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                                    }`}>
                                        {standardQrValidationStatus === 'success' ? <i className="fa-solid fa-check-circle"></i> : <i className="fa-solid fa-times-circle"></i>}
                                        <span>{standardQrValidationStatus === 'success' ? 'Scannable' : 'Unscannable'}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <Button onClick={handleDownloadPng} disabled={!qrValue} size="sm" variant="secondary">
                                        <i className="fa-solid fa-image mr-2"></i>PNG
                                    </Button>
                                    <Button onClick={handleDownloadSvg} disabled={!qrValue} size="sm" variant="secondary">
                                        <i className="fa-solid fa-vector-square mr-2"></i>SVG
                                    </Button>
                                </div>
                            </div>

                            {/* AI Art QR Section */}
                            <div className="flex flex-col items-center justify-center gap-4">
                                <h3 className="text-md font-bold text-slate-700 dark:text-slate-300">AI Art QR</h3>
                                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl shadow-inner">
                                    <div className="bg-white p-2 rounded-lg shadow-md">
                                        <div className="w-40 h-40 rounded-md flex items-center justify-center overflow-hidden relative group">
                                            {isLoading && <Loader size="lg"/>}
                                            {!isLoading && aiQrImage && <img src={aiQrImage} alt="AI Generated QR Code" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>}
                                            {!isLoading && !aiQrImage && (
                                                <div className="w-full h-full text-slate-500 dark:text-slate-400 text-sm p-4 flex flex-col items-center justify-center bg-gradient-to-r from-slate-200/40 via-slate-100/40 to-slate-200/40 dark:from-slate-900/50 dark:via-slate-800/50 dark:to-slate-900/50 animate-shimmer" style={{ backgroundSize: '2000px 100%' }}>
                                                    <i className="fa-solid fa-wand-magic-sparkles text-4xl mb-2"></i>
                                                    <span>Your AI art will appear here</span>
                                                </div>
                                            )}
                                            {aiQrImage && !isLoading && validationStatus !== 'idle' && (
                                                <div className={`absolute top-2 right-2 px-2.5 py-1 text-xs font-bold text-white rounded-full flex items-center gap-1.5 backdrop-blur-sm ${validationStatus === 'success' ? 'bg-green-600/80' : 'bg-red-600/80'}`}>
                                                    {validationStatus === 'success' ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-times"></i>}
                                                    {validationStatus === 'success' ? 'Scannable' : 'Failed'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                    <Button onClick={handleDownloadAI} disabled={!aiQrImage || isLoading} size="sm">
                                        <i className="fa-solid fa-download mr-2"></i>Download
                                    </Button>
                                    <Button onClick={handleValidateAiQr} disabled={!aiQrImage || isLoading} size="sm" variant="secondary">
                                        <i className="fa-solid fa-check-double mr-2"></i>Validate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <hr className="my-6 border-slate-200/80 dark:border-slate-700/80" />
                        
                        {/* Export Section */}
                        <div className="flex flex-col items-center gap-4">
                             <h3 className="text-md font-bold text-slate-700 dark:text-slate-300">Export Options</h3>
                            <div className="w-full max-w-sm">
                                <Button onClick={handleBatchExport} disabled={isExporting || !qrValue} fullWidth>
                                    {isExporting ? <Loader/> : <i className="fa-solid fa-file-archive mr-2"></i>}
                                    {isExporting ? 'Exporting...' : 'Batch Export All as .ZIP'}
                                </Button>
                                {isExporting && exportProgress && (
                                    <div className="space-y-2 pt-2 animate-fade-in mt-2">
                                        <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <span>{exportProgress.message}</span>
                                            <span>{exportProgress.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2.5">
                                            <div
                                                className="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${exportProgress.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default QrGenerator;