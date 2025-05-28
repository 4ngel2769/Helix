<template>
  <div class="emoji-picker-overlay" @click.self="close">
    <div class="emoji-picker">
      <div class="emoji-picker-header">
        <h3>Select an Emoji</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      
      <div class="emoji-search">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search emojis..." 
          class="emoji-search-input"
        />
      </div>
      
      <div class="emoji-categories">
        <button 
          v-for="category in categories" 
          :key="category.id"
          class="category-btn"
          :class="{ active: selectedCategory === category.id }"
          @click="selectedCategory = category.id"
        >
          {{ category.icon }}
        </button>
      </div>
      
      <div class="emoji-grid-container">
        <div v-if="filteredEmojis.length === 0" class="no-emoji-results">
          No emojis found matching "{{ searchQuery }}"
        </div>
        
        <div v-else class="emoji-grid">
          <button 
            v-for="emoji in filteredEmojis" 
            :key="emoji.emoji"
            class="emoji-item"
            @click="selectEmoji(emoji.emoji)"
            :title="emoji.description"
          >
            {{ emoji.emoji }}
          </button>
        </div>
      </div>
      
      <div v-if="selectedEmoji" class="emoji-preview">
        <div class="selected-emoji">{{ selectedEmoji }}</div>
        <button class="btn btn-primary" @click="confirmSelection">Select</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmojiPicker',
  data() {
    return {
      searchQuery: '',
      selectedCategory: 'smileys',
      selectedEmoji: null,
      categories: [
        { id: 'smileys', icon: '😀', description: 'Smileys & Emotion' },
        { id: 'people', icon: '👋', description: 'People & Body' },
        { id: 'animals', icon: '🐶', description: 'Animals & Nature' },
        { id: 'food', icon: '🍕', description: 'Food & Drink' },
        { id: 'travel', icon: '🚗', description: 'Travel & Places' },
        { id: 'activities', icon: '⚽', description: 'Activities' },
        { id: 'objects', icon: '💡', description: 'Objects' },
        { id: 'symbols', icon: '🔣', description: 'Symbols' },
        { id: 'flags', icon: '🏁', description: 'Flags' }
      ],
      emojis: {
        smileys: [
          { emoji: '😀', description: 'Grinning Face' },
          { emoji: '😃', description: 'Grinning Face with Big Eyes' },
          { emoji: '😄', description: 'Grinning Face with Smiling Eyes' },
          { emoji: '😁', description: 'Beaming Face with Smiling Eyes' },
          { emoji: '😆', description: 'Grinning Squinting Face' },
          { emoji: '😅', description: 'Grinning Face with Sweat' },
          { emoji: '🤣', description: 'Rolling on the Floor Laughing' },
          { emoji: '😂', description: 'Face with Tears of Joy' },
          { emoji: '🙂', description: 'Slightly Smiling Face' },
          { emoji: '🙃', description: 'Upside-Down Face' },
          { emoji: '😉', description: 'Winking Face' },
          { emoji: '😊', description: 'Smiling Face with Smiling Eyes' },
          { emoji: '😇', description: 'Smiling Face with Halo' },
          { emoji: '🥰', description: 'Smiling Face with Hearts' },
          { emoji: '😍', description: 'Smiling Face with Heart-Eyes' },
          { emoji: '🤩', description: 'Star-Struck' },
          { emoji: '😘', description: 'Face Blowing a Kiss' },
          { emoji: '😗', description: 'Kissing Face' },
          { emoji: '☺️', description: 'Smiling Face' },
          { emoji: '😚', description: 'Kissing Face with Closed Eyes' },
          { emoji: '😙', description: 'Kissing Face with Smiling Eyes' },
          { emoji: '🥲', description: 'Smiling Face with Tear' }
        ],
        people: [
          { emoji: '👋', description: 'Waving Hand' },
          { emoji: '🤚', description: 'Raised Back of Hand' },
          { emoji: '🖐️', description: 'Hand with Fingers Splayed' },
          { emoji: '✋', description: 'Raised Hand' },
          { emoji: '🖖', description: 'Vulcan Salute' },
          { emoji: '👌', description: 'OK Hand' },
          { emoji: '🤌', description: 'Pinched Fingers' },
          { emoji: '🤏', description: 'Pinching Hand' },
          { emoji: '✌️', description: 'Victory Hand' },
          { emoji: '🤞', description: 'Crossed Fingers' },
          { emoji: '🤟', description: 'Love-You Gesture' },
          { emoji: '🤘', description: 'Sign of the Horns' },
          { emoji: '🤙', description: 'Call Me Hand' },
          { emoji: '👈', description: 'Backhand Index Pointing Left' },
          { emoji: '👉', description: 'Backhand Index Pointing Right' },
          { emoji: '👆', description: 'Backhand Index Pointing Up' },
          { emoji: '🖕', description: 'Middle Finger' },
          { emoji: '👇', description: 'Backhand Index Pointing Down' },
          { emoji: '☝️', description: 'Index Pointing Up' },
          { emoji: '👍', description: 'Thumbs Up' },
          { emoji: '👎', description: 'Thumbs Down' },
          { emoji: '✊', description: 'Raised Fist' }
        ],
        animals: [
          { emoji: '🐶', description: 'Dog Face' },
          { emoji: '🐱', description: 'Cat Face' },
          { emoji: '🐭', description: 'Mouse Face' },
          { emoji: '🐹', description: 'Hamster Face' },
          { emoji: '🐰', description: 'Rabbit Face' },
          { emoji: '🦊', description: 'Fox Face' },
          { emoji: '🐻', description: 'Bear Face' },
          { emoji: '🐼', description: 'Panda Face' },
          { emoji: '🐨', description: 'Koala Face' },
          { emoji: '🐯', description: 'Tiger Face' },
          { emoji: '🦁', description: 'Lion Face' },
          { emoji: '🐮', description: 'Cow Face' },
          { emoji: '🐷', description: 'Pig Face' },
          { emoji: '🐸', description: 'Frog Face' },
          { emoji: '🐵', description: 'Monkey Face' }
        ],
        food: [
          { emoji: '🍏', description: 'Green Apple' },
          { emoji: '🍎', description: 'Red Apple' },
          { emoji: '🍐', description: 'Pear' },
          { emoji: '🍊', description: 'Tangerine' },
          { emoji: '🍋', description: 'Lemon' },
          { emoji: '🍌', description: 'Banana' },
          { emoji: '🍉', description: 'Watermelon' },
          { emoji: '🍇', description: 'Grapes' },
          { emoji: '🍓', description: 'Strawberry' },
          { emoji: '🫐', description: 'Blueberries' },
          { emoji: '🍈', description: 'Melon' },
          { emoji: '🍒', description: 'Cherries' },
          { emoji: '🍑', description: 'Peach' },
          { emoji: '🍍', description: 'Pineapple' },
          { emoji: '🥝', description: 'Kiwi Fruit' },
          { emoji: '🍅', description: 'Tomato' },
          { emoji: '🍆', description: 'Eggplant' },
          { emoji: '🥑', description: 'Avocado' }
        ],
        travel: [
          { emoji: '🚗', description: 'Car' },
          { emoji: '🚕', description: 'Taxi' },
          { emoji: '🚙', description: 'SUV' },
          { emoji: '🚌', description: 'Bus' },
          { emoji: '🚎', description: 'Trolleybus' },
          { emoji: '🏎️', description: 'Racing Car' },
          { emoji: '🚓', description: 'Police Car' },
          { emoji: '🚑', description: 'Ambulance' },
          { emoji: '🚒', description: 'Fire Engine' },
          { emoji: '🚐', description: 'Minibus' },
          { emoji: '🛻', description: 'Pickup Truck' },
          { emoji: '🚚', description: 'Delivery Truck' },
          { emoji: '🚛', description: 'Articulated Lorry' },
          { emoji: '🚜', description: 'Tractor' },
          { emoji: '🛵', description: 'Motor Scooter' }
        ],
        activities: [
          { emoji: '⚽', description: 'Soccer Ball' },
          { emoji: '🏀', description: 'Basketball' },
          { emoji: '🏈', description: 'American Football' },
          { emoji: '⚾', description: 'Baseball' },
          { emoji: '🥎', description: 'Softball' },
          { emoji: '🎾', description: 'Tennis' },
          { emoji: '🏐', description: 'Volleyball' },
          { emoji: '🏉', description: 'Rugby Football' },
          { emoji: '🥏', description: 'Flying Disc' },
          { emoji: '🎱', description: 'Pool 8 Ball' },
          { emoji: '🪀', description: 'Yo-Yo' },
          { emoji: '🏓', description: 'Ping Pong' },
          { emoji: '🏸', description: 'Badminton' },
          { emoji: '🏒', description: 'Ice Hockey' },
          { emoji: '🏑', description: 'Field Hockey' }
        ],
        objects: [
          { emoji: '⌚', description: 'Watch' },
          { emoji: '📱', description: 'Mobile Phone' },
          { emoji: '💻', description: 'Laptop' },
          { emoji: '⌨️', description: 'Keyboard' },
          { emoji: '🖥️', description: 'Desktop Computer' },
          { emoji: '🖨️', description: 'Printer' },
          { emoji: '🖱️', description: 'Computer Mouse' },
          { emoji: '🖲️', description: 'Trackball' },
          { emoji: '🕹️', description: 'Joystick' },
          { emoji: '🗜️', description: 'Clamp' },
          { emoji: '💽', description: 'Computer Disk' },
          { emoji: '💾', description: 'Floppy Disk' },
          { emoji: '💿', description: 'Optical Disk' },
          { emoji: '📀', description: 'DVD' },
          { emoji: '📼', description: 'Videocassette' }
        ],
        symbols: [
          { emoji: '❤️', description: 'Red Heart' },
          { emoji: '🧡', description: 'Orange Heart' },
          { emoji: '💛', description: 'Yellow Heart' },
          { emoji: '💚', description: 'Green Heart' },
          { emoji: '💙', description: 'Blue Heart' },
          { emoji: '💜', description: 'Purple Heart' },
          { emoji: '🖤', description: 'Black Heart' },
          { emoji: '🤍', description: 'White Heart' },
          { emoji: '🤎', description: 'Brown Heart' },
          { emoji: '❣️', description: 'Heart Exclamation' },
          { emoji: '💕', description: 'Two Hearts' },
          { emoji: '💞', description: 'Revolving Hearts' },
          { emoji: '💓', description: 'Beating Heart' },
          { emoji: '💗', description: 'Growing Heart' },
          { emoji: '💖', description: 'Sparkling Heart' }
        ],
        flags: [
          { emoji: '🏁', description: 'Chequered Flag' },
          { emoji: '🚩', description: 'Triangular Flag' },
          { emoji: '🎌', description: 'Crossed Flags' },
          { emoji: '🏴', description: 'Black Flag' },
          { emoji: '🏳️', description: 'White Flag' },
          { emoji: '🏳️‍🌈', description: 'Rainbow Flag' },
          { emoji: '🏳️‍⚧️', description: 'Transgender Flag' },
          { emoji: '🏴‍☠️', description: 'Pirate Flag' }
        ]
      }
    };
  },
  computed: {
    filteredEmojis() {
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const results = [];
        
        // Search through all categories
        Object.values(this.emojis).forEach(categoryEmojis => {
          categoryEmojis.forEach(emoji => {
            if (emoji.description.toLowerCase().includes(query)) {
              results.push(emoji);
            }
          });
        });
        
        return results;
      } else {
        // Just show the selected category
        return this.emojis[this.selectedCategory] || [];
      }
    }
  },
  methods: {
    selectEmoji(emoji) {
      this.selectedEmoji = emoji;
    },
    
    confirmSelection() {
      if (this.selectedEmoji) {
        this.$emit('select', this.selectedEmoji);
        this.close();
      }
    },
    
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.emoji-picker {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 90%;
  max-width: 350px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.emoji-picker-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emoji-picker-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.emoji-search {
  padding: 8px 16px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.emoji-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--bg-tertiary);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 4px;
  font-size: 0.9rem;
}

.emoji-categories {
  display: flex;
  overflow-x: auto;
  padding: 8px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.category-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.category-btn:hover {
  background-color: var(--bg-tertiary);
}

.category-btn.active {
  background-color: var(--bg-primary);
}

.emoji-grid-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.emoji-item {
  background: none;
  border: none;
  font-size: 1.5rem;
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background-color: var(--bg-tertiary);
}

.no-emoji-results {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.emoji-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--bg-tertiary);
}

.selected-emoji {
  font-size: 2rem;
  background-color: var(--bg-primary);
  padding: 8px;
  border-radius: 4px;
  margin-right: 12px;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}
</style>