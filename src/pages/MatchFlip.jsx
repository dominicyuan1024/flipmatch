import { useImmer } from "use-immer";
import "./MatchFlip.css";
import { useEffect } from "react";
import Sound from "./media/sound.js";
import { animals, fruits, music } from "./skins/skins.js";
const skins = [
  { val: "animals", label: "动物农场", format: "text", items: animals },
  { val: "fruits", label: "水果王国", format: "text", items: fruits },
  { val: "music", label: "演奏大师", format: "text", items: music },
];
const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.get("debug") === "true";
const sounder = new Sound();

function makeRandomCells(owner = "", fliped = false) {
  const cellList = [];
  for (let index = 0; index < 18; index++) {
    cellList.push({ id: index, code: index, fliped, owner });
    cellList.push({ id: index + 18, code: index, fliped, owner });
  }
  cellList.sort(() => Math.random() - 0.5);
  return cellList;
}

function User({ id = "", active = false, nickname, score = 0 }) {
  return (
    <p className={id === "Black" ? "userBlack" : "userWhite"}>
      {/* <img src={avator} /> */}
      {active ? <span>👆</span> : null}
      <span>{nickname}</span>
      <span>-</span>
      <span>{score}</span>
    </p>
  );
}

function MatchFlipCell({ id, skin, skinFormat, fliped, upSideDown, owner, handleFlip }) {
  const className = `cell ${owner ? "ownedBy" + owner : ""}`;
  function Content() {
    const classNames = upSideDown ? "upSideDown" : null;
    if (!fliped) {
      return <span className={classNames}>{owner ? null : "?"}</span>;
    }
    if (skinFormat === "text") {
      return <span className={classNames}>{skin}</span>;
    } else if (skinFormat === "image") {
      const sytles = { backgroundImage: `url(${skin})`, backgroundSize: "cover" };
      return <span className={classNames} style={sytles}></span>;
    }
  }
  return (
    <div className={className} onClick={() => handleFlip(id)} debugNum={debugMode ? skin : ""}>
      <Content></Content>
    </div>
  );
}

function Notification({ children, handleClick }) {
  return (
    <div className="pop" onClick={handleClick}>
      {children}
    </div>
  );
}

function Tools({ shuffle, showRules, showSkins }) {
  return (
    <div className="toolbox">
      <button type="button" className="btn" onClick={shuffle}>
        洗牌
      </button>
      <button type="button" className="btn" onClick={showRules}>
        规则
      </button>
      <button type="button" className="btn" onClick={showSkins}>
        皮肤
      </button>
    </div>
  );
}

function SkinItems({ format, items }) {
  if (format === "text") {
    return <p className="skinItems">{items.join(" ")}</p>;
  } else if (format === "image") {
    return (
      <p className="skinItems">
        {items.map((skin) => {
          const sytles = {
            backgroundImage: `url(${skin})`,
            backgroundSize: "cover",
            width: "2.5rem",
            height: "2.5rem",
            display: "inline-block",
            borderRadius: "50%",
          };
          return <span style={sytles}></span>;
        })}
      </p>
    );
  }
}

function MatchFlip() {
  const [cellListState, updateCellListState] = useImmer(() => {
    const cacheCellListString = window.localStorage.getItem("cellList");
    let initList = makeRandomCells();
    if (!cacheCellListString) return makeRandomCells();
    try {
      const cacheCellList = JSON.parse(cacheCellListString);
      if (cacheCellList.length === 0 || cacheCellList[0].id < 0) {
        console.warn("invalid localStorage cellList length 0 or unknown obj");
      } else {
        initList = cacheCellList;
      }
    } catch (error) {
      console.warn("parse localStorage cellList to json failed, makeRandomCells", error);
    }
    return initList;
  });
  useEffect(() => {
    window.localStorage.setItem("cellList", JSON.stringify(cellListState));
  }, [cellListState]);

  const [shuffling, updateShuffling] = useImmer(false);
  async function shuffle() {
    updateCellListState((draft) => draft.forEach((item) => (item.fliped = true)));
    updateShuffling(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    updateCellListState(makeRandomCells("", true));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    updateShuffling(false);
    await new Promise((resolve) => setTimeout(resolve, 800));
    updateCellListState((draft) => draft.forEach((item) => (item.fliped = false)));
  }

  const userBlack = "Black";
  const userWhite = "White";
  const [curUser, updateCurUser] = useImmer(() => {
    const cacheCurUser = window.localStorage.getItem("curUser");
    if (cacheCurUser !== userBlack && cacheCurUser !== userWhite) return userBlack;
    if (!cacheCurUser) return userBlack;
    return cacheCurUser;
  });
  useEffect(() => {
    window.localStorage.setItem("curUser", curUser);
  }, [curUser]);

  let userBlackScore = 0;
  let userWhiteScore = 0;
  cellListState.forEach((item) => {
    if (item.owner === userBlack) {
      userBlackScore++;
    } else if (item.owner === userWhite) {
      userWhiteScore++;
    }
  });

  let isFinished = userBlackScore + userWhiteScore === cellListState.length;
  let finishText = userBlackScore > userWhiteScore ? "黑方胜！" : "白方胜！";
  finishText = userBlackScore === userWhiteScore ? "平手!" : finishText;
  // isFinished=true
  // finishText="平手"

  const [isShowRules, updateIsShowRules] = useImmer(false);

  const [isShowSkins, updateIsShowSkins] = useImmer(false);
  const [usingSkin, updateUsingSkin] = useImmer(() => {
    const cacheUsingSkin = window.localStorage.getItem("usingSkin");
    let usingIdx = skins.findIndex((item) => item.val === cacheUsingSkin);
    usingIdx = usingIdx < 0 ? 0 : usingIdx;
    return skins[usingIdx].val;
  });
  useEffect(() => {
    window.localStorage.setItem("usingSkin", usingSkin);
  }, [usingSkin]);

  let skinStoreObj = skins.find((item) => {
    return item.val === usingSkin;
  });
  const skinStore = skinStoreObj ? skinStoreObj.items : skins[0].items;

  const pendingNot = "";
  // const pendingMatched = "Matched";
  const pendingDismatched = "Dismatched";
  const [pending, updatePending] = useImmer(pendingNot);
  const pendingSecond = 1;
  function handlePending(stat = "") {
    updatePending(stat);
    setTimeout(() => {
      updateCellListState((draft) => {
        draft.forEach((item) => {
          if (stat === pendingDismatched) {
            item.fliped = false;
            updateCurUser(curUser === userBlack ? userWhite : userBlack);
          }
        });
      });
      updatePending(pendingNot);
    }, pendingSecond * 1000);
  }

  function handleFlip(id = -1) {
    updateCellListState((draft) => {
      const cell = draft.find((item) => item.id === id);
      if (!cell) return;
      if (cell.fliped) return;
      if (cell.owner) return;
      const anotherFlipedCell = draft.find((item) => item.fliped && item.id !== id && !item.owner);
      cell.fliped = true;
      if (!anotherFlipedCell) {
        return;
      }
      if (anotherFlipedCell.code === cell.code) {
        // handlePending(pendingMatched);
        cell.owner = curUser;
        anotherFlipedCell.owner = curUser;
        sounder.playSound("success");
        return;
      }
      if (anotherFlipedCell.code !== cell.code) {
        handlePending(pendingDismatched);
        sounder.playSound("error");
        return;
      }
    });
  }

  function changeSkin(evt, val) {
    updateUsingSkin(val);
    evt.stopPropagation();
  }
  return (
    <div className="wrap">
      <h1 className="gameTitle">Flip? Match!</h1>
      <div className="playGround">
        <User id={userBlack} active={curUser === userBlack} nickname="黑" score={userBlackScore}></User>
        <div className={`box ${pending ? "pending" : ""} ${shuffling ? "shuffling" : ""}`}>
          {cellListState.map((item) => (
            <MatchFlipCell
              key={item.id}
              id={item.id}
              skinFormat={skinStoreObj.format}
              skin={skinStore[item.code]}
              fliped={item.fliped}
              upSideDown={curUser === userBlack}
              owner={item.owner}
              handleFlip={handleFlip}
            ></MatchFlipCell>
          ))}
        </div>
        <User id={userWhite} active={curUser === userWhite} nickname="白" score={userWhiteScore}></User>
      </div>
      <Tools shuffle={shuffle} showRules={() => updateIsShowRules(true)} showSkins={() => updateIsShowSkins(true)}></Tools>
      {isShowSkins && (
        <Notification handleClick={() => updateIsShowSkins(false)}>
          <div className="skins">
            {skins.map((item) => {
              return (
                <p key={item.val} className={item.val === usingSkin ? "using" : null} onClick={(evt) => changeSkin(evt, item.val)}>
                  {item.label}
                </p>
              );
            })}
            <SkinItems format={skinStoreObj.format} items={skinStore} />
          </div>
        </Notification>
      )}
      {isShowRules && (
        <Notification handleClick={() => updateIsShowRules(false)}>
          <ul className="rules">
            <li>① 👆代表当前玩家 </li>
            <li>② 玩家轮流翻开两张卡</li>
            <li>③ 成功配对可继续行动，失败轮到下一位</li>
            <li>④ 最终谁收集最多配对谁胜出</li>
          </ul>
        </Notification>
      )}
      {isFinished && (
        <Notification handleClick={shuffle}>
          <div className="finished">
            <p>{finishText}</p>
            <p>{finishText}</p>
          </div>
        </Notification>
      )}
    </div>
  );
}
export default MatchFlip;
