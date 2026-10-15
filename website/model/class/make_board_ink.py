"""The board's ink from the Gallery's drawing (sketch_1600.png, made by make_board_ink.mjs at a 1600 x 900 screen),
drawn a little smaller and centred, as a teacher leaves a margin: SCALE about the screen's middle, so all of it stays
in the part of the board every screen shape shows (16:9 to 21:9; the nav bar over its top). Its layout
(boardLayout.json) is moved the same way, so the page still comes in on its drawing. Then onto the board: the region
the walk's last frame shows (boardQuad.json, 305)."""
import cv2, numpy as np, json
SCALE, CX, CY = 0.82, 800, 450
sk = cv2.imread('sketch_1600.png', cv2.IMREAD_UNCHANGED); sh, sw = sk.shape[:2]; k = sw / 1600
A = np.float32([[SCALE, 0, (1 - SCALE) * CX * k], [0, SCALE, (1 - SCALE) * CY * k]])
small = cv2.warpAffine(sk[..., 3], A, (sw, sh), flags=cv2.INTER_AREA)
q = json.load(open('boardQuad.json'))['305']
BW, BH = 3804, 2166
Hm = cv2.getPerspectiveTransform(np.float32([[u * sw, v * sh] for u, v in q]), np.float32([[0, 0], [BW, 0], [BW, BH], [0, BH]]))
cv2.imwrite('board_ink.png', cv2.warpPerspective(small, Hm, (BW, BH), flags=cv2.INTER_AREA))
lay = json.load(open('boardLayout_raw.json'))
mv = lambda r: [round(CX + (r[0] - CX) * SCALE, 1), round(CY + (r[1] - CY) * SCALE, 1), round(r[2] * SCALE, 1), round(r[3] * SCALE, 1)]
out = {'screen': lay['screen'], 'scale': SCALE, 'head': [mv(r) for r in lay['head']], 'folds': [mv(r) for r in lay['folds']], 'doodles': [mv(r) for r in lay['doodles']]}
json.dump(out, open('boardLayout.json', 'w'))
cv2.imwrite('board_ink_view.jpg', cv2.resize(255 - cv2.imread('board_ink.png', 0), None, fx=0.3, fy=0.3))
print(out['head'][0], out['folds'][0])
