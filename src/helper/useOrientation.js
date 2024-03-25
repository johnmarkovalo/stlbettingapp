import { useState, useEffect } from "react";
import Orientation from 'react-native-orientation-locker';

export const useOrientation = () => {
  const [orientation, setOrientation] = useState(null);

  const _onOrientationDidChange = (orientation) => {
    if (orientation == 'LANDSCAPE-RIGHT' || orientation == 'LANDSCAPE-LEFT' || orientation == 'LANDSCAPE') {
        setOrientation("LANDSCAPE");
    }else{
        setOrientation("PORTRAIT");
    }
  }

  const lockToPortrait = () => {
    Orientation.lockToPortrait();
  }

  const unlockAllOrientations = () => {
    Orientation.unlockAllOrientations()
  }

  useEffect(() => {
    Orientation.addOrientationListener(_onOrientationDidChange);

    var initial = Orientation.getInitialOrientation();
    _onOrientationDidChange(initial)

    return () => {
        Orientation.removeOrientationListener(_onOrientationDidChange);
    }
  }, []);

  return [orientation, lockToPortrait, unlockAllOrientations];
};