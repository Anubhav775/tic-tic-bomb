import React from "react";
import ReactDOM from "react-dom";
import Avatar from "avataaars";

const looks = [
  { label: "Girl avatar 1", topType: "LongHairStraight", hairColor: "BrownDark", skinColor: "Light", clotheType: "Hoodie", clotheColor: "PastelBlue", eyeType: "Happy", mouthType: "Smile" },
  { label: "Boy avatar 1", topType: "ShortHairShortFlat", hairColor: "BrownDark", skinColor: "Brown", facialHairType: "BeardLight", clotheType: "BlazerShirt", clotheColor: "Blue03", eyeType: "Default", mouthType: "Smile" },
  { label: "Girl avatar 2", topType: "LongHairBob", hairColor: "BlondeGolden", skinColor: "Pale", accessoriesType: "Prescription02", clotheType: "ShirtScoopNeck", clotheColor: "PastelRed", eyeType: "Default", mouthType: "Twinkle" },
  { label: "Boy avatar 2", topType: "ShortHairShortCurly", hairColor: "Black", skinColor: "DarkBrown", facialHairType: "MoustacheFancy", clotheType: "Hoodie", clotheColor: "PastelGreen", eyeType: "Happy", mouthType: "Smile" },
  { label: "Girl avatar 3", topType: "LongHairCurly", hairColor: "Red", skinColor: "Tanned", clotheType: "Overall", clotheColor: "PastelYellow", eyeType: "Wink", mouthType: "Smile" },
  { label: "Boy avatar 3", topType: "ShortHairDreads01", hairColor: "Brown", skinColor: "Light", accessoriesType: "Wayfarers", clotheType: "BlazerSweater", clotheColor: "Gray01", eyeType: "Default", mouthType: "Twinkle" },
  { label: "Girl avatar 4", topType: "LongHairFro", hairColor: "Black", skinColor: "Black", accessoriesType: "Round", clotheType: "ShirtVNeck", clotheColor: "PastelOrange", eyeType: "Happy", mouthType: "Smile" },
  { label: "Boy avatar 4", topType: "ShortHairShortWaved", hairColor: "Blonde", skinColor: "Pale", clotheType: "GraphicShirt", clotheColor: "Blue02", eyeType: "Squint", mouthType: "Serious" },
  { label: "Girl avatar 5", topType: "LongHairShavedSides", hairColor: "PastelPink", skinColor: "Yellow", accessoriesType: "Kurt", clotheType: "CollarSweater", clotheColor: "PastelBlue", eyeType: "Surprised", mouthType: "Smile" },
  { label: "Boy avatar 5", topType: "ShortHairTheCaesar", hairColor: "BrownDark", skinColor: "Brown", facialHairType: "BeardMajestic", clotheType: "ShirtCrewNeck", clotheColor: "PastelRed", eyeType: "Default", mouthType: "Smile" },
  { label: "Girl avatar 6", topType: "Hijab", hairColor: "Brown", skinColor: "Light", clotheType: "BlazerSweater", clotheColor: "Pink", eyeType: "Happy", mouthType: "Twinkle" },
  { label: "Boy avatar 6", topType: "ShortHairSides", hairColor: "Red", skinColor: "Tanned", accessoriesType: "Prescription01", clotheType: "Hoodie", clotheColor: "PastelYellow", eyeType: "Wink", mouthType: "Smile" },
  { label: "Girl avatar 7", topType: "LongHairDreads", hairColor: "Auburn", skinColor: "DarkBrown", clotheType: "ShirtScoopNeck", clotheColor: "PastelGreen", eyeType: "Side", mouthType: "Smile" },
  { label: "Boy avatar 7", topType: "ShortHairFrizzle", hairColor: "BlondeGolden", skinColor: "Yellow", facialHairType: "MoustacheMagnum", clotheType: "Overall", clotheColor: "PastelOrange", eyeType: "Happy", mouthType: "Smile" },
  { label: "Girl avatar 8", topType: "LongHairBun", hairColor: "Brown", skinColor: "Brown", accessoriesType: "Prescription01", clotheType: "ShirtVNeck", clotheColor: "Blue03", eyeType: "Default", mouthType: "Twinkle" },
  { label: "Boy avatar 8", topType: "ShortHairTheCaesarSidePart", hairColor: "Black", skinColor: "Light", accessoriesType: "Sunglasses", facialHairType: "BeardLight", clotheType: "GraphicShirt", clotheColor: "PastelGreen", eyeType: "Default", mouthType: "Smile" }
];

window.AVATARS = looks;
const avatarMarkupCache = new Map();
function getAvatarMarkup(index) {
  if (!avatarMarkupCache.has(index)) {
    const look = looks[index] || looks[0];
    const stagingNode = document.createElement("span");
    ReactDOM.render(React.createElement(Avatar, {
      ...look,
      avatarStyle: "Circle",
      style: { width: "100%", height: "100%" }
    }), stagingNode);
    avatarMarkupCache.set(index, stagingNode.innerHTML);
    ReactDOM.unmountComponentAtNode(stagingNode);
  }
  return avatarMarkupCache.get(index);
}
window.paintAvataaars = root => {
  root.querySelectorAll("[data-avatar-render]").forEach(node => {
    const index = Math.max(0, Math.min(looks.length - 1, Number(node.dataset.avatarRender) || 0));
    node.innerHTML = getAvatarMarkup(index);
  });
};
