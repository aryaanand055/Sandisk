`timescale 1ns / 1ps
module led_blinker_tb_glitch;
    reg clk;
    reg reset;
    wire led;

    led_blinker uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        clk = 0;
        #5 clk = 1; #5 clk = 0; // standard
        #2 clk = 1; #3 clk = 0; // fast glitch
        forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #10 reset = 0;
        #500 $finish;
    end
endmodule
