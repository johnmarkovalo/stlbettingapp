import React from 'react';
import {palette} from '../../theme/colors';

// Individual icon imports via direct file paths to avoid broken
// package.json react-native field resolution in Metro
import GameController from 'phosphor-react-native/src/icons/GameController';
import ListChecks from 'phosphor-react-native/src/icons/ListChecks';
import Trophy from 'phosphor-react-native/src/icons/Trophy';
import GearSix from 'phosphor-react-native/src/icons/GearSix';
import ArrowsClockwise from 'phosphor-react-native/src/icons/ArrowsClockwise';
import Broom from 'phosphor-react-native/src/icons/Broom';
import Wrench from 'phosphor-react-native/src/icons/Wrench';
import Warning from 'phosphor-react-native/src/icons/Warning';
import CloudArrowUp from 'phosphor-react-native/src/icons/CloudArrowUp';
import CloudArrowDown from 'phosphor-react-native/src/icons/CloudArrowDown';
import Printer from 'phosphor-react-native/src/icons/Printer';
import ArrowSquareUp from 'phosphor-react-native/src/icons/ArrowSquareUp';
import UserCircle from 'phosphor-react-native/src/icons/UserCircle';
import CaretRight from 'phosphor-react-native/src/icons/CaretRight';
import CaretLeft from 'phosphor-react-native/src/icons/CaretLeft';
import CaretDown from 'phosphor-react-native/src/icons/CaretDown';
import CaretUp from 'phosphor-react-native/src/icons/CaretUp';
import X from 'phosphor-react-native/src/icons/X';
import Trash from 'phosphor-react-native/src/icons/Trash';
import Receipt from 'phosphor-react-native/src/icons/Receipt';
import ArrowLeft from 'phosphor-react-native/src/icons/ArrowLeft';
import ArrowRight from 'phosphor-react-native/src/icons/ArrowRight';
import ArrowBendDownLeft from 'phosphor-react-native/src/icons/ArrowBendDownLeft';
import Backspace from 'phosphor-react-native/src/icons/Backspace';
import CheckCircle from 'phosphor-react-native/src/icons/CheckCircle';
import GridNine from 'phosphor-react-native/src/icons/GridNine';
import Info from 'phosphor-react-native/src/icons/Info';
import MagnifyingGlass from 'phosphor-react-native/src/icons/MagnifyingGlass';
import Calendar from 'phosphor-react-native/src/icons/Calendar';
import Clock from 'phosphor-react-native/src/icons/Clock';
import Plus from 'phosphor-react-native/src/icons/Plus';
import Minus from 'phosphor-react-native/src/icons/Minus';
import MapPin from 'phosphor-react-native/src/icons/MapPin';
import WarningCircle from 'phosphor-react-native/src/icons/WarningCircle';
import Wallet from 'phosphor-react-native/src/icons/Wallet';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  GameController,
  ListChecks,
  Trophy,
  GearSix,
  ArrowsClockwise,
  Broom,
  Wrench,
  Warning,
  CloudArrowUp,
  CloudArrowDown,
  Printer,
  ArrowSquareUp,
  UserCircle,
  CaretRight,
  CaretLeft,
  CaretDown,
  CaretUp,
  X,
  Trash,
  Receipt,
  ArrowLeft,
  ArrowRight,
  ArrowBendDownLeft,
  Backspace,
  CheckCircle,
  Keypad: GridNine,
  Info,
  MagnifyingGlass,
  Calendar,
  Clock,
  Plus,
  Minus,
  MapPin,
  WarningCircle,
  Wallet,
};

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = palette.gray[700],
  weight = 'regular',
}) => {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in ICON_MAP`);
    return null;
  }
  return <IconComponent size={size} color={color} weight={weight} />;
};

export default React.memo(Icon);
