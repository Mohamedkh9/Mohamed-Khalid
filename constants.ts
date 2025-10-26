export enum QrCodeType {
    URL = 'url',
    Text = 'text',
    WiFi = 'wifi',
    Email = 'email',
    SMS = 'sms',
    Geo = 'geo',
    VCard = 'vcard',
    Event = 'event',
    WhatsApp = 'whatsapp',
    LinkFolio = 'linkFolio',
}

// FIX: Define explicit types for QR code fields and types to resolve type inference issues.
interface QrFieldOption {
    value: string;
    label: string;
}

export interface QrField {
    id: string;
    label: string;
    placeholder?: string;
    type: string;
    options?: QrFieldOption[];
    optional?: boolean;
}

export interface QrCodeTypeInfo {
    value: QrCodeType;
    label: string;
    fields: QrField[];
}

export const QR_CODE_TYPES: QrCodeTypeInfo[] = [
    {
        value: QrCodeType.URL,
        label: 'Website URL',
        fields: [
            { id: 'url', label: 'URL', placeholder: 'https://example.com', type: 'text' },
        ],
    },
    {
        value: QrCodeType.LinkFolio,
        label: 'Link Folio (Profile Page)',
        fields: [
            { id: 'profileImageUrl', label: 'Profile Image URL', placeholder: 'https://example.com/image.png', type: 'url' },
            { id: 'name', label: 'Name', placeholder: 'John Doe', type: 'text' },
            { id: 'title', label: 'Title / Bio', placeholder: 'Software Engineer | Cat Enthusiast', type: 'text' },
        ],
    },
    {
        value: QrCodeType.Text,
        label: 'Plain Text',
        fields: [
            { id: 'text', label: 'Text', placeholder: 'Enter your text here', type: 'text' },
        ],
    },
    {
        value: QrCodeType.WiFi,
        label: 'WiFi Network',
        fields: [
            { id: 'ssid', label: 'Network Name (SSID)', placeholder: 'MyWiFiNetwork', type: 'text' },
            { id: 'password', label: 'Password', placeholder: 'YourPassword', type: 'text' },
            { 
                id: 'encryption', 
                label: 'Encryption', 
                type: 'select', 
                options: [
                    { value: 'WPA', label: 'WPA/WPA2' },
                    { value: 'WEP', label: 'WEP' },
                    { value: 'nopass', label: 'No Encryption' }
                ] 
            },
        ],
    },
    {
        value: QrCodeType.Email,
        label: 'Email',
        fields: [
            { id: 'email', label: 'To Email', placeholder: 'recipient@example.com', type: 'email' },
            { id: 'subject', label: 'Subject', placeholder: 'Email Subject', type: 'text' },
            { id: 'body', label: 'Body', placeholder: 'Email body text', type: 'textarea', optional: true },
        ],
    },
    {
        value: QrCodeType.SMS,
        label: 'SMS',
        fields: [
            { id: 'phone', label: 'Phone Number', placeholder: '+11234567890', type: 'tel' },
            { id: 'message', label: 'Message', placeholder: 'Your SMS message', type: 'textarea' },
        ],
    },
    {
        value: QrCodeType.Geo,
        label: 'Geo Location',
        fields: [
            { id: 'latitude', label: 'Latitude', placeholder: '34.052235', type: 'number' },
            { id: 'longitude', label: 'Longitude', placeholder: '-118.243683', type: 'number' },
        ],
    },
    {
        value: QrCodeType.VCard,
        label: 'Contact Card (vCard)',
        fields: [
            { id: 'firstName', label: 'First Name', placeholder: 'John', type: 'text' },
            { id: 'lastName', label: 'Last Name', placeholder: 'Doe', type: 'text' },
            { id: 'phone', label: 'Phone', placeholder: '+15551234567', type: 'tel' },
            { id: 'email', label: 'Email', placeholder: 'john.doe@example.com', type: 'email' },
            { id: 'organization', label: 'Organization', placeholder: 'ACME Inc.', type: 'text', optional: true },
            { id: 'title', label: 'Title', placeholder: 'Software Engineer', type: 'text', optional: true },
            { id: 'website', label: 'Website', placeholder: 'https://example.com', type: 'url', optional: true },
        ],
    },
    {
        value: QrCodeType.Event,
        label: 'Calendar Event',
        fields: [
            { id: 'summary', label: 'Event Title', placeholder: 'Team Meeting', type: 'text' },
            { id: 'dtstart', label: 'Start Time', type: 'datetime-local' },
            { id: 'dtend', label: 'End Time', type: 'datetime-local' },
            { id: 'location', label: 'Location', placeholder: 'Conference Room 1', type: 'text', optional: true },
            { id: 'description', label: 'Description', placeholder: 'Discuss project milestones', type: 'textarea', optional: true },
        ],
    },
    {
        value: QrCodeType.WhatsApp,
        label: 'WhatsApp Chat',
        fields: [
            { id: 'phone', label: 'Phone Number (International format)', placeholder: '15551234567', type: 'tel' },
            { id: 'message', label: 'Pre-filled Message', placeholder: 'Hello!', type: 'textarea', optional: true },
        ],
    },
];

export const ART_PROMPTS: string[] = [
    "A majestic lion with a flowing, vibrant mane",
    "A futuristic cyberpunk city skyline at night with neon lights",
    "A serene Japanese zen garden with a koi pond and cherry blossoms",
    "An intricate stained glass window from a medieval cathedral",
    "A swirling, colorful galaxy of stars, nebulae, and planets",
    "Complex steampunk machinery with brass gears, cogs, and pipes",
    "A low-poly isometric island floating in the sky",
    "Vintage floral patterns on aged, textured paper",
    "An enchanted forest with glowing mushrooms and ancient trees",
    "Art Deco geometric patterns with gold and black",
    "An underwater scene with a sunken pirate ship and marine life",
    "A detailed illustration of a mythical dragon breathing fire",
];