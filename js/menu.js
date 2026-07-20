const menu = document.querySelector('.nav');
const menuToggle = document.querySelector('.checkbox');

menuToggle.addEventListener('click', (e) => {
  e.preventDefault();

  if (window.getComputedStyle(menu).display === 'block') {
    menu.style.display = 'none';
  } else  {
    menu.style.display = 'block';
  }
});