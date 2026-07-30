new Vue({
    el: "._icons",
    data: {
      rawIcons: [],
      languageType: 'zh-hk'
    },
    computed: {
      Icons() {
        return this.rawIcons.filter(item => item.type === 'Tchi');
      }
    },
    created() {
      $.ajaxSettings.async = false;
      $.getJSON(
              '/data/homeImageFooter.json',
              function (_data) {
                this.rawIcons = _data.homeImageFooter;
              }.bind(this)
      )
    }
  });