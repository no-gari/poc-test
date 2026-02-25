import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Samsung Card AI Inspector',
    description: 'AI Ad Inspection Tool',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
