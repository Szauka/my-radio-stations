// hls.js ships types only for its main entry; the light build has the same API.
declare module 'hls.js/light' {
  import Hls from 'hls.js';
  export default Hls;
}
