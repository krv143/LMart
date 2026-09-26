const words = [
    document.getElementById('word1'),
    document.getElementById('word2'),
    document.getElementById('word3')
  ];

  function showWord(index) {
    words[index].classList.add('show');
  }

  function cycleWords() {
    words.forEach((word, index) => {
      setTimeout(() => {
        showWord(index);
      }, index * 1000); // Stagger appearance of words
    });

    setTimeout(() => {
        window.location.href = 'login.html';
      }, words.length * 1500);
  }

  // Start the cycle
  cycleWords();
 