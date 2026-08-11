import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

const STROKE = 'white';
const STROKE_WIDTH = 2;

export function InstantRideIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 22" fill="none">
      <Path
        d="M2 13C1.81 13 1.62 12.94 1.46 12.84C1.3 12.74 1.17 12.6 1.09 12.43C1.01 12.26 0.98 12.07 1 11.88C1.02 11.69 1.1 11.51 1.22 11.36L11.12 1.17C11.19 1.08 11.29 1.02 11.4 1C11.51 0.98 11.63 1 11.73 1.05C11.83 1.11 11.91 1.19 11.95 1.3C12 1.4 12.01 1.52 11.98 1.63L10.06 7.65C10 7.8 9.98 7.96 10 8.12C10.02 8.28 10.08 8.43 10.17 8.57C10.27 8.7 10.39 8.81 10.53 8.88C10.68 8.96 10.84 9 11 9H18C18.19 9 18.37 9.05 18.53 9.15C18.69 9.25 18.82 9.4 18.9 9.56C18.99 9.74 19.02 9.93 19 10.12C18.97 10.31 18.9 10.48 18.78 10.63L8.88 20.83C8.81 20.91 8.71 20.97 8.59 20.99C8.48 21.01 8.37 20.99 8.27 20.94C8.17 20.89 8.09 20.8 8.04 20.7C8 20.59 7.99 20.48 8.02 20.37L9.94 14.35C10 14.2 10.02 14.03 10 13.87C9.98 13.71 9.92 13.56 9.83 13.43C9.73 13.3 9.61 13.19 9.47 13.11C9.32 13.04 9.16 13 9 13H2Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PrivateRideIcon({ size = 24 }: { size?: number }) {
  return (
    // The padlock artwork spans x=1..19 (centre 10), not the viewBox's centre
    // of 12 — so a plain "0 0 24 24" box drew it 2 units left of centre, which
    // showed as an off-centre lock inside the round service-type badge. Shifting
    // the viewBox origin left by 2 re-centres it without touching the paths.
    <Svg width={size} height={size} viewBox="-2 0 24 24" fill="none">
      <Path
        d="M17 11H3C1.89 11 1 11.9 1 13V20C1 21.1 1.89 22 3 22H17C18.1 22 19 21.1 19 20V13C19 11.9 18.1 11 17 11Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 11V7C4 5.67 4.53 4.4 5.46 3.46C6.4 2.53 7.67 2 9 2C10.33 2 11.6 2.53 12.53 3.46C13.47 4.4 14 5.67 14 7V11"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScheduledRideIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6V12L16 14"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UploadIcon({
  size = 32,
  color = '#99A1AF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M28 20V25.33C28 26.04 27.72 26.72 27.22 27.22C26.72 27.72 26.04 28 25.33 28H6.67C5.96 28 5.28 27.72 4.78 27.22C4.28 26.72 4 26.04 4 25.33V20"
        stroke={color}
        strokeWidth={2.67}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22.67 10.67L16 4L9.33 10.67"
        stroke={color}
        strokeWidth={2.67}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 4V20"
        stroke={color}
        strokeWidth={2.67}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckCircleIcon({
  size = 96,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Circle cx="48" cy="48" r="40" stroke={color} strokeWidth={6} />
      <Path
        d="M32 48L44 60L66 36"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockSmallIcon({
  size = 16,
  color = '#464646',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M12 6V12L16 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CarIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 13L4.5 8.5C4.7 7.6 5.5 7 6.5 7H17.5C18.5 7 19.3 7.6 19.5 8.5L21 13V18C21 18.55 20.55 19 20 19H19C18.45 19 18 18.55 18 18V17H6V18C6 18.55 5.55 19 5 19H4C3.45 19 3 18.55 3 18V13Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="14.5" r="1" fill={color} />
      <Circle cx="16.5" cy="14.5" r="1" fill={color} />
    </Svg>
  );
}

export function ChevronDownIcon({
  size = 14,
  color = '#717182',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={(size * 7) / 14} viewBox="0 0 14 7" fill="none">
      <Path
        d="M1 1L7 6L13 1"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PersonSmallIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 16, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12L10 17L20 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MenuIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
      <Path
        d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 16, color = '#4A5565' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function StarIcon({ size = 16, color = '#FFB100' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 14, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M12 5L19 12L12 19"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RupeeBadgeIcon({ size = 18, color = '#F0F0FA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path
        d="M8 7H16M8 10H16M10 7C12.5 7 13 10 10 10H8L14 17"
        stroke="#0097B3"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ListBadgeIcon({ size = 18, color = '#F0F0FA' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path
        d="M9 8H16M9 12H16M9 16H16"
        stroke="#0097B3"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx="7" cy="8" r="0.8" fill="#0097B3" />
      <Circle cx="7" cy="12" r="0.8" fill="#0097B3" />
      <Circle cx="7" cy="16" r="0.8" fill="#0097B3" />
    </Svg>
  );
}

export function TabHomeIcon({ size = 20, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V14H9V21H4C3.45 21 3 20.55 3 20V12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TabRidesIcon({ size = 20, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11L6.5 7H17.5L19 11V17H17V15H7V17H5V11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="13" r="1" fill={color} />
      <Circle cx="16" cy="13" r="1" fill={color} />
    </Svg>
  );
}

export function TabEarningsIcon({ size = 20, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2V22M17 5H9.5C8.57 5 7.68 5.37 7.02 6.02C6.37 6.68 6 7.57 6 8.5C6 9.43 6.37 10.32 7.02 10.98C7.68 11.63 8.57 12 9.5 12H14.5C15.43 12 16.32 12.37 16.98 13.02C17.63 13.68 18 14.57 18 15.5C18 16.43 17.63 17.32 16.98 17.98C16.32 18.63 15.43 19 14.5 19H6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TabProfileIcon({ size = 20, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9 19.57 16.84 18.78 16.05C18 15.27 16.94 14.83 15.83 14.83H8.17C7.06 14.83 6 15.27 5.22 16.05C4.43 16.84 4 17.9 4 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function TabMenuIcon({ size = 20, color = '#6A7282' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 20, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhoneIcon({ size = 20, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92V19.92C22 20.47 21.78 21 21.39 21.39C21 21.78 20.47 22 19.92 22C16.43 21.62 13.11 20.42 10.21 18.51C7.51 16.76 5.24 14.49 3.49 11.79C1.57 8.88 0.37 5.55 0 2.05C0 1.5 0.22 0.97 0.61 0.58C1 0.19 1.53 0 2.08 0H5.08C6.04 0 6.86 0.68 7.01 1.62C7.12 2.36 7.31 3.09 7.58 3.78C7.78 4.33 7.65 4.94 7.25 5.34L6.09 6.5C7.72 9.4 10.1 11.78 13 13.41L14.16 12.25C14.56 11.85 15.17 11.72 15.72 11.92C16.41 12.19 17.14 12.38 17.88 12.49C18.83 12.64 19.51 13.48 19.5 14.43L19.5 14.44"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(1 1)"
      />
    </Svg>
  );
}

export function MapPinIcon({ size = 64, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61 3.95 5.32 5.64 3.64C7.32 1.95 9.61 1 12 1C14.39 1 16.68 1.95 18.36 3.64C20.05 5.32 21 7.61 21 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function DownloadIcon({
  size = 16,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15V19C21 19.53 20.79 20.04 20.41 20.41C20.04 20.79 19.53 21 19 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 10L12 15L17 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WalletIcon({
  size = 18,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12V8C20 7.45 19.55 7 19 7H5C3.9 7 3 6.1 3 5C3 3.9 3.9 3 5 3H18V7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 5V19C3 20.1 3.9 21 5 21H20C20.55 21 21 20.55 21 20V16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="17" cy="14" r="2" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EmailIcon({
  size = 18,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} />
      <Path
        d="M2 6L12 13L22 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CarOutlineIcon({
  size = 18,
  color = '#00C896',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 13L4.5 8.5C4.7 7.6 5.5 7 6.5 7H17.5C18.5 7 19.3 7.6 19.5 8.5L21 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 13V18C3 18.55 3.45 19 4 19H5C5.55 19 6 18.55 6 18V17H18V18C18 18.55 18.45 19 19 19H20C20.55 19 21 18.55 21 18V13H3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="14.5" r="1" fill={color} />
      <Circle cx="16.5" cy="14.5" r="1" fill={color} />
    </Svg>
  );
}

export function BankIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10L12 3L21 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="5" y1="10" x2="5" y2="18" stroke={color} strokeWidth={2} />
      <Line x1="10" y1="10" x2="10" y2="18" stroke={color} strokeWidth={2} />
      <Line x1="14" y1="10" x2="14" y2="18" stroke={color} strokeWidth={2} />
      <Line x1="19" y1="10" x2="19" y2="18" stroke={color} strokeWidth={2} />
      <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function GiftIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="8" width="18" height="4" stroke={color} strokeWidth={2} />
      <Path d="M5 12V21H19V12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="8" x2="12" y2="21" stroke={color} strokeWidth={2} />
      <Path
        d="M12 8C12 8 10 4 7.5 4C6.12 4 5 5.12 5 6.5C5 7.88 6.12 8 7.5 8H12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M12 8C12 8 14 4 16.5 4C17.88 4 19 5.12 19 6.5C19 7.88 17.88 8 16.5 8H12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HelpIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M9.09 9C9.3 8.41 9.69 7.9 10.21 7.56C10.73 7.22 11.35 7.08 11.96 7.16C12.58 7.24 13.14 7.54 13.56 8.01C13.97 8.48 14.2 9.08 14.2 9.71C14.2 11.5 11.5 12.4 11.5 12.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

export function ClipboardListIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="4" width="14" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="9" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth={2} />
      <Line x1="9" y1="11" x2="15" y2="11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="9" y1="15" x2="15" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="9" y1="19" x2="13" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function DocumentIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6C5.47 2 4.96 2.21 4.59 2.59C4.21 2.96 4 3.47 4 4V20C4 20.53 4.21 21.04 4.59 21.41C4.96 21.79 5.47 22 6 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V8L14 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2V8H20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function LogoutIcon({
  size = 20,
  color = '#E02D3C',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17L21 12L16 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = 18,
  color = '#99A1AF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InfoCircleIcon({
  size = 20,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

export function TicketIcon({
  size = 20,
  color = '#E02D3C',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 9C2 8.45 2.45 8 3 8H21C21.55 8 22 8.45 22 9V11C20.9 11 20 11.9 20 13C20 14.1 20.9 15 22 15V17C22 17.55 21.55 18 21 18H3C2.45 18 2 17.55 2 17V15C3.1 15 4 14.1 4 13C4 11.9 3.1 11 2 11V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1="13" y1="9" x2="13" y2="17" stroke={color} strokeWidth={2} strokeDasharray="2 2" />
    </Svg>
  );
}

export function DoubleChevronRightIcon({
  size = 24,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 17L11 12L6 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 17L18 12L13 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AlertCircleIcon({
  size = 40,
  color = '#E7000B',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1" fill={color} />
    </Svg>
  );
}

export function SOSAlertIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18C1.64 18.31 1.55 18.66 1.55 19.01C1.55 19.37 1.64 19.72 1.82 20.03C2 20.34 2.26 20.59 2.57 20.77C2.88 20.94 3.24 21.03 3.6 21.02H20.53C20.89 21.03 21.25 20.94 21.56 20.77C21.87 20.59 22.13 20.34 22.31 20.03C22.49 19.72 22.58 19.37 22.58 19.01C22.58 18.66 22.49 18.31 22.31 18L13.84 3.86C13.66 3.55 13.4 3.3 13.09 3.12C12.78 2.95 12.43 2.85 12.07 2.85C11.71 2.85 11.36 2.95 11.05 3.12C10.74 3.3 10.48 3.55 10.29 3.86Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

export function BackArrowIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 19L5 12L12 5"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EyeIcon({
  size = 16,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EditPencilIcon({
  size = 16,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5C18.9 2.1 19.43 1.87 20 1.87C20.57 1.87 21.1 2.1 21.5 2.5C21.9 2.9 22.13 3.43 22.13 4C22.13 4.57 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({
  size = 18,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={2} />
      <Line
        x1="8.59"
        y1="13.51"
        x2="15.42"
        y2="17.49"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="15.41"
        y1="6.51"
        x2="8.59"
        y2="10.49"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HourglassIcon({
  size = 14,
  color = '#FFA726',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2H18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 22H18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 22V18C17 16.93 16.58 15.9 15.83 15.17L12 12L8.17 15.17C7.42 15.9 7 16.93 7 18V22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 2V6C7 7.06 7.42 8.09 8.17 8.83L12 12L15.83 8.83C16.58 8.09 17 7.06 17 6V2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RoutingIcon({
  size = 20,
  color = '#364B63',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="5" r="2.5" stroke={color} strokeWidth={1.8} />
      <Circle cx="19" cy="19" r="2.5" stroke={color} strokeWidth={1.8} />
      <Path
        d="M7.5 5H14C16.2 5 18 6.8 18 9C18 11.2 16.2 13 14 13H10C7.8 13 6 14.8 6 17C6 19.2 7.8 21 10 21H16.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
    </Svg>
  );
}

export function MoneyIcon({
  size = 20,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7H18C19.1 7 20 7.9 20 9V15C20 16.1 19.1 17 18 17H4C2.9 17 2 16.1 2 15V9C2 7.9 2.9 7 4 7Z"
        fill={color}
      />
      <Path
        d="M6 4H20C21.1 4 22 4.9 22 6V12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx="11" cy="12" r="2.5" fill="#0097B3" />
    </Svg>
  );
}

export function BellIcon({
  size = 24,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9V11.59C5 12.12 4.78 12.62 4.41 12.99L3 14.41C2.73 14.68 2.73 15.1 3 15.37C3.13 15.5 3.31 15.58 3.5 15.58H20.5C20.69 15.58 20.87 15.5 21 15.37C21.27 15.1 21.27 14.68 21 14.41L19.59 12.99C19.22 12.62 19 12.12 19 11.59V9C19 5.13 15.87 2 12 2Z"
        fill={color}
      />
      <Path
        d="M14 18C14 19.1 13.1 20 12 20C10.9 20 10 19.1 10 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ReceiptIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M9 8h6M9 12h6M9 16h4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SendIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DownloadArrowIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3V15M12 15L7 10M12 15L17 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UploadArrowIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21V9M12 9L7 14M12 9L17 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 7V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UsersIcon({
  size = 20,
  color = '#4A5565',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21V19C17 17.9 16.6 16.9 15.8 16.2C15.1 15.4 14.1 15 13 15H5C3.9 15 2.9 15.4 2.2 16.2C1.4 16.9 1 17.9 1 19V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 11C11.2 11 13 9.2 13 7C13 4.8 11.2 3 9 3C6.8 3 5 4.8 5 7C5 9.2 6.8 11 9 11Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M23 21V19C23 18.1 22.7 17.2 22.1 16.5C21.5 15.8 20.8 15.3 19.9 15.1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 3.1C16.9 3.3 17.7 3.8 18.2 4.5C18.8 5.2 19.1 6.1 19.1 7C19.1 7.9 18.8 8.8 18.2 9.5C17.7 10.2 16.9 10.7 16 10.9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LocationPinSmallIcon({
  size = 16,
  color = '#4A5565',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C12 22 20 16 20 10C20 5.6 16.4 2 12 2C7.6 2 4 5.6 4 10C4 16 12 22 12 22Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13C13.7 13 15 11.7 15 10C15 8.3 13.7 7 12 7C10.3 7 9 8.3 9 10C9 11.7 10.3 13 12 13Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CopyIcon({
  size = 20,
  color = '#0097B3',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 8V5C16 3.9 15.1 3 14 3H5C3.9 3 3 3.9 3 5V14C3 15.1 3.9 16 5 16H8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 10H19C20.1 10 21 10.9 21 12V19C21 20.1 20.1 21 19 21H10C8.9 21 8 20.1 8 19V12C8 10.9 8.9 10 10 10Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BigCheckIcon({
  size = 64,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12L10 17L19 8"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function QrCodeIcon({
  size = 20,
  color = '#9810FA',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2h-2v-2zm0 4h2v2h-2v-2z"
        fill={color}
      />
    </Svg>
  );
}

export function XCircleIcon({
  size = 20,
  color = '#E02D3C',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
        fill={color}
      />
    </Svg>
  );
}

export function UserXIcon({
  size = 20,
  color = '#E02D3C',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 14c-2.67 0-8 1.34-8 4v2h11v-2c0-.34.03-.67.08-1H8.54c.73-.78 2.72-1.95 6.46-1.95.5 0 .98.03 1.43.08l1.93-1.93c-.93-.11-2.03-.2-3.36-.2zM15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm7.54 11.54L21.12 16l-2.12 2.12L16.88 16l-1.42 1.54L17.58 19.66 15.46 21.78l1.42 1.42L19 21.08l2.12 2.12 1.42-1.42L20.42 19.66z"
        fill={color}
      />
    </Svg>
  );
}

// ── Wallet action icons (vuesax/linear style — match Figma node 188:7822) ──

/**
 * Card with a "+" badge — Recharge Wallet action chip.
 */
export function CardAddIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 8.5h13M2 12.5h7"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M6.5 17.5h4M14.5 17.5h.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M22 12.03V14.5c0 3.5-.89 4.5-4.35 4.5H6.35C2.89 19 2 18 2 14.5V8.5C2 5 2.89 4 6.35 4h7.4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 8V2M22 5h-6"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Sticky note / document with lines — Wallet Statement action chip.
 */
export function StickyNoteIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.5V8c0-4-1-5-5-5H8C4 3 3 4 3 8v8c0 4 1 5 5 5h4.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 13l-7 7v-3.5c0-2 1.5-3.5 3.5-3.5H21z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 8h8M8 13h5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Coin with an upward-right arrow — Send Amount action chip
 * (matches Figma vuesax money-send).
 */
export function MoneySendIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.5 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M9 12h5M11.5 9.5L14 12l-2.5 2.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 6.5L19 2.5M19 2.5h-3M19 2.5v3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Coin with an inward arrow — Received Amount action chip
 * (matches Figma vuesax money-receive).
 */
export function MoneyReceiveIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.5 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M14 12H9M11.5 14.5L9 12l2.5-2.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 6.5L15 2.5M15 2.5h3M15 2.5v3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Coin with a downward arrow — Cashout Amount action chip.
 */
export function CashoutIcon({
  size = 24,
  color = 'white',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M12 9v6M9.5 12.5L12 15l2.5-2.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
