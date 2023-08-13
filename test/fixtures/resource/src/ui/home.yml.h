/** This file is generated from Home.yml */

#include <ui.h>

typedef struct {
        ui_widget_t *input_message;
        ui_widget_t *btn_save_message;
        ui_widget_t *feedback;
} Home_refs_t;

static const char *css_str_0 = "\
root {\
  background-color: #f6f8fa;\
}\
\
.feedback {\
  color: #28a745;\
  font-size: 12px;\
  margin-top: 5px;\
}\
\
";


static void Home_load_template(ui_widget_t *Home_parent, Home_refs_t *refs)
{
        ui_widget_t *w[4];

        w[0] = ui_create_widget("text");
        w[1] = ui_create_widget(NULL);
        ui_widget_set_text(w[1], "Enter a message and save it.");
        ui_widget_append(w[0], w[1]);
        refs->input_message = ui_create_widget("textedit");
        ui_widget_set_attr(refs->input_message, "placeholder", "eg: hello, world!");
        refs->btn_save_message = ui_create_widget("button");
        w[2] = ui_create_widget(NULL);
        ui_widget_set_text(w[2], "Save");
        ui_widget_append(refs->btn_save_message, w[2]);
        refs->feedback = ui_create_widget("text");
        ui_widget_add_class(refs->feedback, "feedback");
        w[3] = ui_create_widget(NULL);
        ui_widget_set_text(w[3], "Message has been saved!");
        ui_widget_append(refs->feedback, w[3]);
        ui_widget_append(Home_parent, w[0]);
        ui_widget_append(Home_parent, refs->input_message);
        ui_widget_append(Home_parent, refs->btn_save_message);
        ui_widget_append(Home_parent, refs->feedback);
}

static void Home_load_resources(void)
{
        ui_load_css_string(css_str_0, "home.css");
        pd_font_library_load_file("iconfont.ttf");
}
