import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import "./CinemaSeatMap.css";

/**
 * CinemaSeatMap
 * -------------
 * Sơ đồ ghế rạp chiếu phim 3D, dựng ghế theo dữ liệu thật.
 *
 * Props:
 * - rows: [{ rowLabel, seats: [{ seatId, showtimeSeatId, seatRow, seatNumber,
 *            seatType: "VIP"|"Normal", status: "Available"|"Booked"|"Holding",
 *            isHeldByCurrentUser }] }]
 * - activeSeatKey: key ghế cần bay camera tới (null = quay về toàn rạp)
 * - maxSeats: số ghế tối đa chọn cùng lúc (optional)
 * - onSelectionChange(selectedSeats): bắn ra khi danh sách ghế chọn thay đổi (optional)
 */
export default function CinemaSeatMap({ rows, activeSeatKey, maxSeats, onSelectionChange }) {
  const mountRef = useRef(null);
  const controllerRef = useRef({});

  const [previewSeat, setPreviewSeat] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState("overview"); // 'overview' | 'seatview'
  const [hud, setHud] = useState({ code: "—", dist: "—", angle: "—" });

  const seatKeyOf = (s) => String(s.showtimeSeatId ?? s.seatId);

  // Ghế đang giữ bởi chính user -> tự chọn sẵn
  useEffect(() => {
    const heldKeys = rows.flatMap((r) => r.seats).filter((s) => s.isHeldByCurrentUser).map(seatKeyOf);
    if (heldKeys.length) setSelectedKeys(new Set(heldKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // =====================================================================
  // DỰNG SCENE
  // =====================================================================
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const mount = mountRef.current;

    const selectedKeysRef = { current: selectedKeys };

    // ---------- CONFIG ----------
    const SEAT_W = 0.86, SEAT_GAP = 0.18, AISLE_GAP = 0.6;
    const ROW_Z_STEP = 1.35, ROW_Y_STEP = 0.36;
    const SCREEN_Z = -15, SCREEN_Y = 4.4, SCREEN_W = 15, SCREEN_H = 6.4;
    const SEAT_CUSHION_TOP = 0.49;
    const SEATED_EYE_ABOVE_CUSHION = 0.75;
    const EYE_HEIGHT = SEAT_CUSHION_TOP + SEATED_EYE_ABOVE_CUSHION;
    const UP = new THREE.Vector3(0, 1, 0);

    // ---------- SCENE ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b10);
    scene.fog = new THREE.Fog(0x0a0b10, 12, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 100);

    // ---------- LIGHTS ----------
    scene.add(new THREE.AmbientLight(0x2a2438, 0.9));
    const screenGlow = new THREE.PointLight(0xf3e6c2, 2.2, 30, 2);
    screenGlow.position.set(0, SCREEN_Y - 1, SCREEN_Z + 2);
    scene.add(screenGlow);
    const sconceL = new THREE.PointLight(0x7a3a2a, 0.9, 20);
    sconceL.position.set(-9, 4, -2);
    scene.add(sconceL);
    const sconceR = sconceL.clone();
    sconceR.position.set(9, 4, -2);
    scene.add(sconceR);
    const topLight = new THREE.DirectionalLight(0x9aa0c0, 0.35);
    topLight.position.set(0, 12, 4);
    scene.add(topLight);

    // ---------- SCREEN ----------
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512; screenCanvas.height = 220;
    const sctx = screenCanvas.getContext("2d");
    const grad = sctx.createLinearGradient(0, 0, 512, 220);
    grad.addColorStop(0, "#2b3a52"); grad.addColorStop(0.5, "#e8c98f"); grad.addColorStop(1, "#7a2f3a");
    sctx.fillStyle = grad; sctx.fillRect(0, 0, 512, 220);
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      new THREE.MeshBasicMaterial({ map: screenTex })
    );
    screenMesh.position.set(0, SCREEN_Y, SCREEN_Z);
    scene.add(screenMesh);

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(SCREEN_W + 0.6, SCREEN_H + 0.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.9 })
    );
    bezel.position.set(0, SCREEN_Y, SCREEN_Z - 0.15);
    scene.add(bezel);

    const screenCenter = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
    const screenAimPoint = new THREE.Vector3(0, SCREEN_Y + SCREEN_H * 0.12, SCREEN_Z);

    // ---------- FLOOR ----------
    const ROWS = rows.length;
    const maxColsAnyRow = Math.max(...rows.map((r) => r.seats.length));
    const totalWidth = maxColsAnyRow * (SEAT_W + SEAT_GAP) + AISLE_GAP + 2;
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1620, roughness: 0.95 });
    for (let r = 0; r < ROWS; r++) {
      const z = -6 + r * ROW_Z_STEP;
      const y = r * ROW_Y_STEP;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(totalWidth, 0.3, ROW_Z_STEP + 0.3), floorMat);
      plat.position.set(0, y - 0.15, z);
      plat.receiveShadow = true;
      scene.add(plat);
    }
    const frontFloor = new THREE.Mesh(new THREE.BoxGeometry(totalWidth, 0.3, 8), floorMat);
    frontFloor.position.set(0, -0.15, SCREEN_Z + 6);
    scene.add(frontFloor);
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 14),
      new THREE.MeshStandardMaterial({ color: 0x120f16, roughness: 1 })
    );
    backWall.position.set(0, 5, -6 + ROWS * ROW_Z_STEP + 3);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    // ---------- MÀU ----------
    const colorAvailable = new THREE.Color(0x6b1f2e);
    const colorBooked = new THREE.Color(0x3a3c46);
    const colorVip = new THREE.Color(0xc9a24b);
    const colorSelected = new THREE.Color(0xe6c46a);

    function colorFor(seatMeta) {
      if (seatMeta.status === "Booked") return colorBooked;
      if (selectedKeysRef.current.has(seatMeta.key)) return colorSelected;
      if (seatMeta.seatType === "VIP") return colorVip;
      return colorAvailable;
    }

    // ---------- DỰNG GHẾ ----------
    const seatGroup = new THREE.Group();
    scene.add(seatGroup);
    const seatMeshes = [];
    const seatByKey = new Map();

    rows.forEach((rowData, r) => {
      const seatsInRow = rowData.seats;
      const colsInRow = seatsInRow.length;
      const y = r * ROW_Y_STEP;
      const z = -6 + r * ROW_Z_STEP;
      const half = colsInRow / 2;

      seatsInRow.forEach((seatData, c) => {
        const x =
          (c - (colsInRow - 1) / 2) * (SEAT_W + SEAT_GAP) +
          (c >= half ? AISLE_GAP * 0.5 : -AISLE_GAP * 0.5);

        const key = seatKeyOf(seatData);
        const code = `${seatData.seatRow ?? rowData.rowLabel}${seatData.seatNumber}`;
        const meta = {
          key, code,
          seatType: seatData.seatType,
          status: seatData.status,
          isVip: seatData.seatType === "VIP",
          raw: seatData,
          eyePos: new THREE.Vector3(x, y + EYE_HEIGHT, z),
        };

        const seat = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: colorFor(meta).clone(), roughness: 0.7, metalness: 0.05,
        });

        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(SEAT_W, 0.14, 0.62), mat);
        seatBase.position.set(0, 0.42, 0);
        seat.add(seatBase);

        const back = new THREE.Mesh(new THREE.BoxGeometry(SEAT_W, 0.68, 0.12), mat);
        back.position.set(0, 0.78, 0.26);
        seat.add(back);

        const armMat = new THREE.MeshStandardMaterial({ color: 0x1c1a20, roughness: 0.6 });
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.6), armMat);
        armL.position.set(-SEAT_W / 2 - 0.02, 0.55, 0);
        seat.add(armL);
        const armR = armL.clone(); armR.position.x = SEAT_W / 2 + 0.02;
        seat.add(armR);

        seat.position.set(x, y, z);
        seat.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        seat.userData.isSeat = true;
        seat.userData.key = key;

        seatGroup.add(seat);
        const entry = { mesh: seat, mat, meta };
        seatMeshes.push(entry);
        seatByKey.set(key, entry);
      });
    });

    function repaint(key) {
      const entry = seatByKey.get(key);
      if (!entry) return;
      const c = colorFor(entry.meta);
      entry.mat.color.copy(c);
      entry.mat.emissive.copy(
        selectedKeysRef.current.has(key) ? c.clone().multiplyScalar(0.35) : new THREE.Color(0, 0, 0)
      );
    }
    seatMeshes.forEach((e) => repaint(e.meta.key));

    // ---------- CAMERA CONTROLS ----------
    const target = new THREE.Vector3(0, 3, -3);
    let radius = 15, theta = 0.0, phi = 1.05;
    let dragging = false, lastX = 0, lastY = 0;
    let modeLocal = "overview";
    let seatViewEye = null;
    let transitioning = false;
    const seatLookMouse = { x: 0, y: 0 };

    setMode("overview");

    function overviewPosition() {
      return new THREE.Vector3(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
    }

    function updateOverviewCamera() {
      camera.position.copy(overviewPosition());
      camera.lookAt(target);
    }
    updateOverviewCamera();

    const onPointerDown = (e) => {
      if (modeLocal !== "overview") return;
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    const onPointerMove = (e) => {
      if (modeLocal === "overview" && dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        theta -= dx * 0.0045;
        phi = Math.max(0.35, Math.min(1.5, phi - dy * 0.0035));
        lastX = e.clientX; lastY = e.clientY;
        updateOverviewCamera();
      } else if (modeLocal === "seatview" && !transitioning) {
        // Chỉ nhận chuột khi đã bay xong, tránh giật ở cuối animation
        seatLookMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
        seatLookMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
      }
    };
    const onWheel = (e) => {
      if (modeLocal !== "overview") return;
      radius = Math.max(6, Math.min(28, radius + e.deltaY * 0.012));
      updateOverviewCamera();
    };

    // ---------- RAYCAST ----------
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();

    function setPointer(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function findSeatFromObject(obj) {
      let o = obj;
      while (o) { if (o.userData?.isSeat) return o; o = o.parent; }
      return null;
    }

    function computeStats(meta) {
      const eye = meta.eyePos;
      const dist = eye.distanceTo(screenCenter);
      const hAngle = Math.atan2(eye.x - screenCenter.x, screenCenter.z - eye.z) * 180 / Math.PI;
      const vAngle = Math.atan2(screenCenter.y - eye.y, Math.abs(screenCenter.z - eye.z)) * 180 / Math.PI;
      return { dist, hAngle, vAngle };
    }

    function handleSeatClick(key) {
      const entry = seatByKey.get(key);
      if (!entry || entry.meta.status === "Booked") return;
      controllerRef.current.toggleSelect(key);
      const st = computeStats(entry.meta);
      setPreviewSeat({
        key, code: entry.meta.code, isVip: entry.meta.isVip,
        dist: st.dist, hAngle: st.hAngle, vAngle: st.vAngle,
      });
      setPanelOpen(true);
    }

    const onClick = (e) => {
      if (modeLocal !== "overview") return;
      setPointer(e);
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(seatGroup.children, true);
      if (hits.length) {
        const seat = findSeatFromObject(hits[0].object);
        if (seat) handleSeatClick(seat.userData.key);
      }
    };
    const onHoverMove = (e) => {
      if (modeLocal !== "overview") return;
      setPointer(e);
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(seatGroup.children, true);
      const seat = hits.length ? findSeatFromObject(hits[0].object) : null;
      const entry = seat ? seatByKey.get(seat.userData.key) : null;
      renderer.domElement.style.cursor = entry && entry.meta.status !== "Booked" ? "pointer" : "default";
    };

    // ---------- CHUYỂN CẢNH CAMERA ----------
    function easeInOutQuint(t) {
      return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
    }

    let transitionRafId = null;

    function animateCamera(fromPos, toPos, fromQuat, toQuat, fromFov, toFov, duration, onDone) {
      if (transitionRafId) { cancelAnimationFrame(transitionRafId); transitionRafId = null; }
      transitioning = true;
      const start = performance.now();

      const fp = fromPos.clone(), tp = toPos.clone();
      const fq = fromQuat.clone();
      const tq = toQuat.clone();

      // Đi đường xoay ngắn nhất
      if (fq.dot(tq) < 0) tq.set(-tq.x, -tq.y, -tq.z, -tq.w);

      function step(now) {
        const raw = Math.min(1, (now - start) / duration);
        const e = easeInOutQuint(raw);

        camera.position.lerpVectors(fp, tp, e);
        camera.quaternion.slerpQuaternions(fq, tq, e);
        camera.fov = fromFov + (toFov - fromFov) * e;
        camera.updateProjectionMatrix();

        if (raw < 1) {
          transitionRafId = requestAnimationFrame(step);
        } else {
          transitionRafId = null;
          camera.quaternion.copy(tq);
          transitioning = false;
          if (onDone) onDone();
        }
      }
      transitionRafId = requestAnimationFrame(step);
    }

    // ✅ FIX CHÍNH: dùng Matrix4.lookAt (quy ước camera nhìn về -Z).
    // Object3D.lookAt() thường sẽ quay +Z về mục tiêu => ngược 180° => camera quay ra sau.
    function lookAtQuat(pos, lookTarget) {
      const m = new THREE.Matrix4().lookAt(pos, lookTarget, UP);
      return new THREE.Quaternion().setFromRotationMatrix(m);
    }

    function goToSeatView(key) {
      const entry = seatByKey.get(key);
      if (!entry) return;

      modeLocal = "seatview";
      setMode("seatview");
      setPanelOpen(false);

      seatLookMouse.x = 0; seatLookMouse.y = 0;
      seatViewEye = null; // tạm dừng vòng render tự lookAt trong lúc bay

      const eye = entry.meta.eyePos.clone();
      const st = computeStats(entry.meta);
      const targetFov = Math.max(55, Math.min(88, 100 - st.dist * 1.7));

      const fromPos = camera.position.clone();
      const fromQuat = camera.quaternion.clone();
      const fromFov = camera.fov;
      const toQuat = lookAtQuat(eye, screenAimPoint);

      animateCamera(fromPos, eye, fromQuat, toQuat, fromFov, targetFov, 1600, () => {
        setHud({ code: entry.meta.code, dist: st.dist.toFixed(1) + " m", angle: Math.abs(st.hAngle).toFixed(0) + "°" });
        seatLookMouse.x = 0; seatLookMouse.y = 0;
        seatViewEye = eye.clone();
      });
    }

    function exitSeatView() {
      if (modeLocal !== "seatview") return; // tránh chạy lúc mới mount (activeSeatKey = null)

      // Tính vị trí đích mà KHÔNG đụng vào camera hiện tại
      const toPos = overviewPosition();
      const fromPos = camera.position.clone();
      const fromQuat = camera.quaternion.clone();
      const toQuat = lookAtQuat(toPos, target);

      seatViewEye = null; // dừng vòng render tự lookAt trong lúc bay về

      animateCamera(fromPos, toPos, fromQuat, toQuat, camera.fov, 52, 1200, () => {
        modeLocal = "overview";
        setMode("overview");
        updateOverviewCamera();
        setPanelOpen(true);
      });
    }

    controllerRef.current = {
      toggleSelect: (key) => {
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          if (next.has(key)) {
            next.delete(key);
          } else {
            if (maxSeats && next.size >= maxSeats) return prev;
            next.add(key);
          }
          return next;
        });
      },
      viewSeat: (key) => goToSeatView(key),
      exitView: () => exitSeatView(),
      selectedKeysRef,
    };

    // ---------- EVENT LISTENERS ----------
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("pointermove", onHoverMove);

    // ---------- RESIZE ----------
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ---------- RENDER LOOP ----------
    let rafId;
    function render() {
      rafId = requestAnimationFrame(render);
      if (modeLocal === "seatview" && !transitioning && seatViewEye) {
        camera.position.copy(seatViewEye);
        camera.up.set(0, 1, 0);
        const lookTarget = screenAimPoint.clone();
        lookTarget.x += seatLookMouse.x * 3.5;
        lookTarget.y += -seatLookMouse.y * 1.6;
        camera.lookAt(lookTarget);
      }
      screenGlow.intensity = 2.0 + Math.sin(Date.now() * 0.001) * 0.15;
      renderer.render(scene, camera);
    }
    render();

    mount.__cinemaRepaintAll = () => seatMeshes.forEach((e) => repaint(e.meta.key));
    mount.__cinemaSelectedKeysRef = selectedKeysRef;

    // ---------- CLEANUP ----------
    return () => {
      cancelAnimationFrame(rafId);
      if (transitionRafId) cancelAnimationFrame(transitionRafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("pointermove", onHoverMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ---------- Bay camera khi activeSeatKey thay đổi ----------
  useEffect(() => {
    if (activeSeatKey && controllerRef.current?.viewSeat) {
      controllerRef.current.viewSeat(String(activeSeatKey));
    } else if (!activeSeatKey && controllerRef.current?.exitView) {
      controllerRef.current.exitView();
    }
  }, [activeSeatKey]);

  // ---------- Đồng bộ màu ghế khi selectedKeys đổi ----------
  useEffect(() => {
    const mount = mountRef.current;
    if (mount && mount.__cinemaSelectedKeysRef) {
      mount.__cinemaSelectedKeysRef.current = selectedKeys;
      mount.__cinemaRepaintAll();
    }
    if (onSelectionChange) {
      const all = rows.flatMap((r) => r.seats);
      onSelectionChange(all.filter((s) => selectedKeys.has(seatKeyOf(s))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeys]);

  const handleClearOne = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const totalSelected = selectedKeys.size;

  return (
    <div className="cinema-wrap">
      <div className="cinema-canvas" ref={mountRef} />

      <div className={`cinema-screen-preview${activeSeatKey ? " to-popup" : ""}`}>
        <div className="screen-glow-bar" />
        <span className="screen-label">MÀN HÌNH CHIẾU</span>
      </div>

      <div className="ui cinema-legend">
        <div className="legend-row"><span className="swatch available" />Ghế trống</div>
        <div className="legend-row"><span className="swatch booked" />Đã đặt</div>
        <div className="legend-row"><span className="swatch vip" />Ghế VIP</div>
        <div className="legend-row"><span className="swatch selected" />Đang chọn</div>
      </div>

      <div className={"ui cinema-panel" + (panelOpen && mode === "overview" ? " show" : "")}>
        {previewSeat && (
          <>
            <div className="row1">
              <div className="seat-code">{previewSeat.code}</div>
              <div className="seat-type">{previewSeat.isVip ? "GHẾ VIP" : "GHẾ THƯỜNG"}</div>
            </div>
            <div className="stats">
              <div className="stat"><div className="num">{previewSeat.dist.toFixed(1)} m</div><div className="lbl">khoảng cách đến màn hình</div></div>
              <div className="stat"><div className="num">{Math.abs(previewSeat.hAngle).toFixed(0)}°</div><div className="lbl">lệch ngang</div></div>
              <div className="stat"><div className="num">{previewSeat.vAngle.toFixed(0)}°</div><div className="lbl">góc ngước lên</div></div>
            </div>
            <div className="actions">
              <button className="primary" onClick={() => controllerRef.current.viewSeat?.(previewSeat.key)}>
                Xem thử góc nhìn từ ghế này
              </button>
              <button onClick={() => handleClearOne(previewSeat.key)}>Bỏ chọn ghế này</button>
            </div>
          </>
        )}
        {totalSelected > 0 && (
          <div className="selected-summary">Đang chọn {totalSelected} ghế{maxSeats ? ` / tối đa ${maxSeats}` : ""}</div>
        )}
      </div>

      <div className={"ui cinema-hud-top" + (mode === "seatview" ? " show" : "")}>
        Đang xem từ ghế <b>{hud.code}</b> · {hud.dist} · lệch {hud.angle}
      </div>
      <div className={"ui cinema-exit-btn" + (mode === "seatview" ? " show" : "")}>
        <button className="primary" onClick={() => controllerRef.current.exitView?.()}>Quay lại sơ đồ ghế</button>
      </div>
    </div>
  );
}