function homeMethod() {
        window.location.href=window.location.protocol+"//"+window.location.host+'/zh-hk/home.html';
      }
      new Vue({
        el: '#header-container',
        data: {
          icons: {},          // 动态存储所有图标数据
          iconOrder: [],      // 控制图标显示顺序
          languageType: 'zh-hk'
        },
        components: {},
        methods: {
          getIconClass: function(index) {
            if (this.iconOrder.length > index) {
              const iconName = this.iconOrder[index];
              // 根据图标名称生成CSS类名
              const className = '_' + iconName.toLowerCase().replace(/\s+/g, '-');
              return className;
            }
            return '';
          },
          getIconText: function(index) {
            if (this.iconOrder.length > index) {
              const iconName = this.iconOrder[index];
              const iconData = this.icons[iconName];
              return iconData ? (iconData.name || iconName) : '';
            }
            return '';
          },
          getIconUrl: function(index) {
            if (this.iconOrder.length > index) {
              const iconName = this.iconOrder[index];
              const iconData = this.icons[iconName];
              return iconData && iconData.publishUrl ? iconData.publishUrl : '#';
            }
            return '#';
          },
          getIconSrc: function(index) {
            if (this.iconOrder.length > index) {
              const iconName = this.iconOrder[index];
              const iconData = this.icons[iconName];
              if (iconData && iconData.fileName) {
                const baseUrl = '/' + this.languageType + '/image/';
                return baseUrl + iconData.fileName;
              }
            }
            return '';
          }
        },
        mounted: function () {
        },
        created: function () {
          $.ajaxSettings.async = false;
          $.getJSON(
                  '/data/homeImageIcon.json',
                  function (_data) {
                    var data = _data.homeImageIcon;
                    data.forEach(e => {
                      if (e.type === 'Tchi') {
                        // 动态添加图标数据到icons对象中
                        this.icons[e.name] = e;
                        // 按顺序记录图标名称
                        this.iconOrder.push(e.name);
                      }
                    });
                  }.bind(this)
          );
        },
      })