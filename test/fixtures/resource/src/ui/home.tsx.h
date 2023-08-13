/** This file is generated from home.tsx */

#include <ui.h>

/** This css code string is compiled from file home.module.css */
static const char *css_str_0 = "\
.home {\
  padding: 20px;\
}\
\
._button_1ayu2_9 {\
  padding: 5px 10px;\
  text-align: center;\
  border: 1px solid #eee;\
  border-radius: 4px;\
}\
\
._text_1ayu2_23 {\
  color: #f00;\
  font-size: 24px;\
}\
\
";


static void home_load_template(ui_widget_t *home_parent)
{
        ui_widget_t *w[5];

        w[0] = ui_create_widget(NULL);
        ui_widget_add_class(w[0], "home");
        w[1] = ui_create_widget(NULL);
        ui_widget_add_class(w[1], "_text_1ayu2_23");
        w[2] = ui_create_widget("text");
        ui_widget_set_text(w[2], "Hello, World!");
        ui_widget_append(w[1], w[2]);
        w[3] = ui_create_widget(NULL);
        ui_widget_add_class(w[3], "_button_1ayu2_9");
        w[4] = ui_create_widget("text");
        ui_widget_set_text(w[4], "Ok");
        ui_widget_append(w[3], w[4]);
        ui_widget_append(w[0], w[1]);
        ui_widget_append(w[0], w[3]);
}

static void home_load_resources(void)
{
        ui_load_css_string(css_str_0, "home.tsx");
}
