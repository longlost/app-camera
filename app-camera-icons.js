
import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
import htmlString from './app-camera-icons.html';

const appCameraIcons = document.createElement('div');
appCameraIcons.setAttribute('style', 'display: none;');
appCameraIcons.innerHTML = htmlString;
document.head.appendChild(appCameraIcons);
