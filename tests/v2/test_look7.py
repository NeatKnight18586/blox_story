import struct, sys, tempfile, unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from fetch_look_assets import bump_to_normal, read_hdr, hdri_stats  # noqa: E402


class Look7(unittest.TestCase):
    def test_flat_bump_is_up(self):
        n = bump_to_normal(np.full((8, 8), .5, np.float32))
        self.assertTrue((n == [128, 128, 255]).all())

    def test_slope_direction(self):
        h = np.tile(np.linspace(0, 1, 16, dtype=np.float32), (16, 1))      # rises to the right (+U)
        n = bump_to_normal(h, 4.0)[8, 8].astype(int)
        self.assertLess(n[0], 128)                                          # normal leans to −X (away from the rise)
        v = np.tile(np.linspace(0, 1, 16, dtype=np.float32)[:, None], (1, 16))   # rises downward (−V)
        self.assertGreater(bump_to_normal(v, 4.0)[8, 8, 1], 128)            # normal leans to +V (OpenGL green up)

    def test_hdr_roundtrip_and_stats(self):
        W, H = 16, 4
        rows = b''
        for y in range(H):                     # RLE scanlines: header 2 2 W>>8 W&255, then 4 channels as one run each
            rows += bytes([2, 2, 0, W])
            for c, v in enumerate((128, 64, 32, 129)): rows += bytes([128 + W, v])
        data = b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n' + f'-Y {H} +X {W}\n'.encode() + rows
        with tempfile.NamedTemporaryFile(suffix='.hdr', delete=False) as f: f.write(data)
        rgb = read_hdr(f.name)
        self.assertEqual(rgb.shape, (H, W, 3))
        self.assertAlmostEqual(float(rgb[0, 0, 0]), 128 * 2.0 ** (129 - 136), places=6)
        st = hdri_stats(rgb)
        self.assertAlmostEqual(st['rb'], 4.0, places=3)
        self.assertLess(st['sunShare'], .1)    # a flat sky: no sun


if __name__ == '__main__':
    unittest.main()
