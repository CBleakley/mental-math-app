// Stroke icons from the screen designs, drawn with react-native-svg so they work on iOS too.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

function strokeProps(color: string, strokeWidth: number) {
  return {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function GearIcon({ size = 20, color, strokeWidth = 1.8 }: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Circle cx={12} cy={12} r={3} {...s} />
      <Path
        {...s}
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
      />
    </Svg>
  );
}

export function MicIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Rect x={9} y={2} width={6} height={12} rx={3} {...s} />
      <Path {...s} d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <Path {...s} d="M12 18v4" />
    </Svg>
  );
}

/** Speaker with one wave, or two when `loud`. */
export function SpeakerIcon({ size = 20, color, strokeWidth = 2, loud = false }: IconProps & { loud?: boolean }) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path {...s} d="M11 5 6 9H3v6h3l5 4V5z" />
      <Path {...s} d="M15.5 8.5a5 5 0 0 1 0 7" />
      {loud ? <Path {...s} d="M18.5 5.5a9 9 0 0 1 0 13" /> : null}
    </Svg>
  );
}

export function CrossIcon({ size = 16, color, strokeWidth = 2.6 }: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path {...s} d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function CheckIcon({ size = 38, color, strokeWidth = 2.4 }: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path {...s} d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function BackIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  const s = strokeProps(color, strokeWidth);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path {...s} d="m15 18-6-6 6-6" />
    </Svg>
  );
}
