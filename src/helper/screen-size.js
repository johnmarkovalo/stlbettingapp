import {Dimensions} from 'react-native';

export function isSmallScreen() {
    const windowWidth = Dimensions.get('window').width;
    return windowWidth <= 375;
}
