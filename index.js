$(document).ready(() => {
  $("#explore__link").click(() => {
    $(".ford").slideToggle().css("display", "flex");
    $(".ford__arrow").css("rotate", "rotate(180deg)");
  });
});

const aLinks = document.querySelectorAll("a");
console.log(aLinks);
aLinks.forEach((elem) => {
  elem.addEventListener("click", (e) => {
    //   e.preventDefault();
  });
});

const view3d = document.querySelector(".view__3d");
console.log(view3d);
view3d.addEventListener("click", (e) => {
    e.target.href = "view.html"
   console.log(e.target);
})

